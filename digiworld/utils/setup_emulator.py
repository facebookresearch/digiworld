#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Utility script for setting up emulators with mock apps.

This script:
1. Uninstalls existing apps (to ensure fresh install, avoids stale versions)
2. Installs APK files from the current_apps directory
3. Opens each app to activate them
4. Runs set_environment for each app with a specified profile
5. Supports both ADB and Genymotion backends
6. Supports parallel setup of multiple emulators

The goal is to put emulators in a state that allows running experiments.
"""

import argparse
import json
import os
import re
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests
import urllib3
from packaging.version import Version, InvalidVersion

from digiworld.adb.actions import ADBActions
from digiworld.adb.backends import ADBBackend, GenymotionBackend
from app_config import APP_CONFIG, DEFAULT_APPS, ALL_APPS

# Suppress SSL warnings for Genymotion self-signed certs
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Thread-safe print lock
_print_lock = threading.Lock()


def safe_print(*args, **kwargs):
    """Thread-safe print function."""
    with _print_lock:
        print(*args, **kwargs)


@dataclass
class EmulatorTarget:
    """Represents a target emulator for setup."""
    backend_type: str  # 'adb' or 'genymotion'
    identifier: str    # device serial for ADB, IP for Genymotion
    username: Optional[str] = None  # Genymotion only
    password: Optional[str] = None  # Genymotion only
    
    def __str__(self):
        return f"{self.backend_type}:{self.identifier}"


@dataclass
class SetupResult:
    """Result of setting up a single emulator."""
    target: EmulatorTarget
    success: bool
    apps_succeeded: int
    apps_total: int
    failed_apps: List[Tuple[str, str]]  # (app_name, reason)
    error: Optional[str] = None


def find_apk_directory(base_path: Path = None) -> Path:
    """
    Find the current_apps directory containing APK files.
    
    Args:
        base_path: Optional base path to start from (defaults to script's grandparent dir)
        
    Returns:
        Path to current_apps directory
        
    Raises:
        FileNotFoundError: If current_apps directory cannot be found
    """
    if base_path is None:
        base_path = Path(__file__).parent.parent
    
    apk_dir = base_path / "current_apps"
    
    if not apk_dir.exists():
        raise FileNotFoundError(f"APK directory not found: {apk_dir}")
    
    return apk_dir


def load_lockfile(lockfile_path: Path = None) -> Dict[str, str]:
    """Load APK versions from lockfile.
    
    Args:
        lockfile_path: Path to lockfile. Defaults to ../apk_versions.json
        
    Returns:
        Dict mapping app name to version string
        
    Raises:
        FileNotFoundError: If lockfile doesn't exist
    """
    if lockfile_path is None:
        lockfile_path = Path(__file__).parent.parent / "apk_versions.json"
    
    if not lockfile_path.exists():
        raise FileNotFoundError(f"Lockfile not found: {lockfile_path}")
    
    with open(lockfile_path) as f:
        data = json.load(f)
    
    return data.get("apps", {})


def uninstall_app(bundle_id: str, backend, prefix: str = "", verbose: bool = False) -> bool:
    """
    Uninstall an app by bundle ID.
    
    Args:
        bundle_id: Android package name to uninstall
        backend: Backend instance (ADB or Genymotion)
        prefix: Prefix for log messages (e.g., "[device-1] ")
        verbose: Whether to show command output
        
    Returns:
        True if uninstall succeeded or app wasn't installed, False on error
    """
    try:
        result = backend.execute_command(f"pm uninstall {bundle_id}", is_shell=True)
        result_str = result.strip() if isinstance(result, str) else str(result)
        
        if "Success" in result_str:
            safe_print(f"{prefix}    Uninstalled: {bundle_id}")
            return True
        elif "not installed" in result_str.lower() or "Failure" in result_str:
            if verbose:
                safe_print(f"{prefix}    Not installed: {bundle_id}")
            return True
        else:
            if verbose:
                safe_print(f"{prefix}    Uninstall result for {bundle_id}: {result_str}")
            return True
    except Exception as e:
        if verbose:
            safe_print(f"{prefix}    Note: Could not uninstall {bundle_id}: {e}")
        return True


def install_apk(apk_path: Path, backend, prefix: str = "", verbose: bool = False) -> bool:
    """
    Install an APK using the provided backend.
    
    Args:
        apk_path: Path to the APK file
        backend: Backend instance (ADB or Genymotion)
        prefix: Prefix for log messages
        verbose: Whether to show command output
        
    Returns:
        True if installation succeeded, False otherwise
    """
    try:
        if verbose:
            safe_print(f"{prefix}  Installing: {apk_path.name}")
        return backend.install_apk(str(apk_path))
    except Exception as e:
        safe_print(f"{prefix}  Error installing {apk_path.name}: {e}")
        return False


def get_installed_version_name(backend, bundle_id: str) -> Optional[str]:
    """
    Query the installed versionName of a package on the device.
    
    Args:
        backend: Backend instance (ADB or Genymotion)
        bundle_id: Android package name
        
    Returns:
        The installed versionName string, or None if not determinable
    """
    output = backend.run_shell_with_output(
        f"dumpsys package {bundle_id} | grep versionName"
    )
    if output:
        for line in output.strip().splitlines():
            if "versionName=" in line:
                return line.split("versionName=")[1].strip()
    return None


def verify_installed_version(
    backend, bundle_id: str, min_version: str, app_name: str, prefix: str = ""
) -> bool:
    """
    Verify the installed app version meets the minimum required version.
    
    Args:
        backend: Backend instance (ADB or Genymotion)
        bundle_id: Android package name
        min_version: Minimum required version (semver string)
        app_name: App name for log messages
        prefix: Prefix for log messages
        
    Returns:
        True if version is compatible, False otherwise
    """
    installed = get_installed_version_name(backend, bundle_id)
    if installed is None:
        safe_print(f"{prefix}  WARNING: Could not determine installed version for {app_name}")
        return False
    try:
        if Version(installed) >= Version(min_version):
            safe_print(f"{prefix}  Version OK: {installed} >= {min_version}")
            return True
        else:
            safe_print(f"{prefix}  Version MISMATCH: installed {installed} < required {min_version}")
            return False
    except InvalidVersion as e:
        safe_print(f"{prefix}  WARNING: Could not parse version for {app_name}: {e}")
        return False


def open_app(bundle_id: str, backend, prefix: str = "", verbose: bool = False) -> bool:
    """
    Open an app to activate it.
    
    Args:
        bundle_id: Android package name
        backend: Backend instance (ADB or Genymotion)
        prefix: Prefix for log messages
        verbose: Whether to show command output
        
    Returns:
        True if app opened successfully, False otherwise
    """
    try:
        cmd = f"monkey -p {bundle_id} -c android.intent.category.LAUNCHER 1"
        if verbose:
            safe_print(f"{prefix}  Running: {cmd}")
        backend.execute_command(cmd, is_shell=True)
        time.sleep(3)
        return True
    except Exception as e:
        safe_print(f"{prefix}  Error opening {bundle_id}: {e}")
        return False


def setup_app_environment(bundle_id: str, profile: str, backend, prefix: str = "", 
                          data_path: str = None, verbose: bool = False) -> bool:
    """
    Run set_environment for an app.
    
    Args:
        bundle_id: Android package name
        profile: Profile name (e.g., 'test-profile-1')
        backend: Backend instance
        prefix: Prefix for log messages
        data_path: Optional custom path for state data
        verbose: Whether to show detailed output
        
    Returns:
        True if environment setup succeeded, False otherwise
    """
    try:
        safe_print(f"{prefix}  Setting up environment for {bundle_id} with profile {profile}...")

        adb = ADBActions(bundle_id=bundle_id, backend=backend, custom_path=data_path)
        result = adb.set_environment(data_id=profile)
        
        if result:
            safe_print(f"{prefix}  Successfully set up environment for {bundle_id}")
            return True
        else:
            safe_print(f"{prefix}  Failed to set up environment for {bundle_id}")
            return False
            
    except Exception as e:
        safe_print(f"{prefix}  Error setting up environment for {bundle_id}: {e}")
        if verbose:
            import traceback
            traceback.print_exc()
        return False


def find_apk_for_app(apk_dir: Path, tag_pattern: str, version: Optional[str] = None) -> Optional[Path]:
    """
    Find the APK file for an app by matching tag pattern.
    
    If version is specified (semver like "1.2.0"), looks for the best matching APK:
    first tries an exact match, then finds the latest compatible APK with the same
    major.minor that is >= the requested version.
    Otherwise, returns the most recently modified APK matching the pattern.
    
    Args:
        apk_dir: Directory containing APK files
        tag_pattern: Tag pattern to match (e.g., "email", "smarthome")
        version: Optional version to match (semver like "1.2.0" or legacy like "73")
        
    Returns:
        Path to the APK file, or None if not found
    """
    if version:
        # Try exact match first
        exact_pattern = f"{tag_pattern}-{version}-release.apk"
        exact_match = apk_dir / exact_pattern
        if exact_match.exists():
            return exact_match
        alt_pattern = f"{tag_pattern}-{version}.apk"
        alt_match = apk_dir / alt_pattern
        if alt_match.exists():
            return alt_match

        # Try semver-aware matching: find latest APK with same major.minor >= version
        try:
            min_ver = Version(version)
            best_path = None
            best_ver = None
            for apk_file in apk_dir.glob(f"{tag_pattern}-*-release.apk"):
                match = re.search(
                    rf"^{re.escape(tag_pattern)}-(.+)-release\.apk$",
                    apk_file.name,
                )
                if not match:
                    continue
                try:
                    file_ver = Version(match.group(1))
                except InvalidVersion:
                    continue
                if (file_ver.major == min_ver.major
                        and file_ver.minor == min_ver.minor
                        and file_ver >= min_ver):
                    if best_ver is None or file_ver > best_ver:
                        best_ver = file_ver
                        best_path = apk_file
            if best_path is not None:
                return best_path
        except InvalidVersion:
            pass

        return None
    
    patterns = [
        f"{tag_pattern}-*-release.apk",
        f"{tag_pattern}-*.apk",
        f"{tag_pattern}*.apk",
    ]
    
    for pattern in patterns:
        matches = list(apk_dir.glob(pattern))
        if matches:
            return max(matches, key=lambda p: p.stat().st_mtime)
    
    return None


def get_apps_to_install(apk_dir: Path, app_names: List[str], versions: Dict[str, str] = None,
                        prefix: str = "") -> List[tuple]:
    """
    Get list of apps to install.
    
    Args:
        apk_dir: Directory containing APK files
        app_names: List of app names to install (e.g., ["email", "pay", "music"])
        versions: Optional dict of app_name -> version from lockfile
        prefix: Prefix for log messages
        
    Returns:
        List of (apk_path, bundle_id, app_name) tuples
    """
    apps = []
    missing_apps = []
    invalid_apps = []
    
    for app_name in app_names:
        if app_name not in APP_CONFIG:
            invalid_apps.append(app_name)
            continue
            
        _, bundle_id, tag_pattern = APP_CONFIG[app_name]
        version = versions.get(app_name) if versions else None
        apk_path = find_apk_for_app(apk_dir, tag_pattern, version)
        
        if apk_path:
            apps.append((apk_path, bundle_id, app_name))
        else:
            if version:
                missing_apps.append((app_name, f"{tag_pattern}-{version}-release.apk"))
            else:
                missing_apps.append((app_name, f"{tag_pattern}-*-release.apk"))
    
    if invalid_apps:
        safe_print(f"{prefix}Error: Unknown app names: {', '.join(invalid_apps)}")
        safe_print(f"{prefix}Valid app names: {', '.join(sorted(APP_CONFIG.keys()))}")
    
    if missing_apps:
        safe_print(f"{prefix}Warning: The following APKs were not found:")
        for app_name, pattern in missing_apps:
            safe_print(f"{prefix}  - {app_name}: {pattern}")
    
    return apps


def create_backend(target: EmulatorTarget) -> object:
    """
    Create an appropriate backend for the given target.
    
    Args:
        target: EmulatorTarget instance
        
    Returns:
        Backend instance (ADBBackend or GenymotionBackend)
    """
    if target.backend_type == 'genymotion':
        return GenymotionBackend(
            ip=target.identifier,
            username=target.username,
            password=target.password,
            use_env_variables=False
        )
    else:
        return ADBBackend(device_serial=target.identifier if target.identifier else None)


def enable_root_access(target: EmulatorTarget, disable: bool = False) -> bool:
    """
    Enable or disable root/superuser access on a Genymotion emulator.
    
    Uses setprop persist.sys.root_access to control root access level:
    - 0 = disabled
    - 1 = apps only
    - 2 = adb only
    - 3 = apps and adb (full root)
    
    Args:
        target: EmulatorTarget (must be genymotion type)
        disable: If True, disable root instead of enabling
        
    Returns:
        True if successful, False otherwise
    """
    if target.backend_type != 'genymotion':
        safe_print(f"[{target.identifier}] Root access control only supported for Genymotion")
        return False
    
    prefix = f"[{target.identifier}] "
    url = f"https://{target.identifier}:443/api/v1/android/shell"
    headers = {
        "accept": "text/plain",
        "Content-Type": "application/json"
    }
    
    # Set root access level
    root_level = "0" if disable else "3"
    action = "Disabling" if disable else "Enabling"
    command = f"setprop persist.sys.root_access {root_level}"
    
    safe_print(f"{prefix}{action} root access...")
    
    data = {
        "commands": [command],
        "timeout_in_seconds": 5
    }
    
    response = requests.post(
        url,
        auth=(target.username, target.password),
        json=data,
        headers=headers,
        verify=False
    )
    
    if response.status_code != 200:
        safe_print(f"{prefix}Failed to set root access: HTTP {response.status_code}")
        return False
    
    # Wait for the setting to take effect
    time.sleep(3)
    
    # Verify root access is working (only if enabling)
    if not disable:
        verify_data = {
            "commands": ["su -c whoami"],
            "timeout_in_seconds": 5
        }
        verify_response = requests.post(
            url,
            auth=(target.username, target.password),
            json=verify_data,
            headers=headers,
            verify=False
        )
        
        if verify_response.status_code == 200:
            result = verify_response.content.decode('utf-8').strip()
            if 'root' in result:
                safe_print(f"{prefix}Root access enabled successfully")
                return True
            else:
                safe_print(f"{prefix}Root verification failed: {result}")
                return False
        else:
            safe_print(f"{prefix}Root verification request failed")
            return False
    else:
        safe_print(f"{prefix}Root access disabled")
        return True


def disable_superuser_toasts(target: EmulatorTarget) -> bool:
    """
    Disable toast notifications from the Genymotion SuperUser app.
    
    This prevents the SuperUser app from showing toast messages every time
    a root command is executed, which would interfere with agent screenshots.
    
    Works by modifying the SuperUser app's SQLite database to set
    notification preference to 0 (disabled).
    
    Args:
        target: EmulatorTarget (must be genymotion type)
        
    Returns:
        True if successful, False otherwise
    """
    if target.backend_type != 'genymotion':
        return True  # Skip for ADB devices
    
    prefix = f"[{target.identifier}] "
    safe_print(f"{prefix}Disabling SuperUser toast notifications...")
    
    import sqlite3
    import tempfile
    import urllib.parse
    
    # Create a minimal SQLite database with notification disabled
    with tempfile.NamedTemporaryFile(suffix='.sqlite', delete=False) as tmp_file:
        tmp_path = tmp_file.name
    
    conn = sqlite3.connect(tmp_path)
    cursor = conn.cursor()
    cursor.execute("CREATE TABLE IF NOT EXISTS android_metadata (locale TEXT)")
    cursor.execute("INSERT OR REPLACE INTO android_metadata VALUES('en_US')")
    cursor.execute("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY NOT NULL, value TEXT)")
    cursor.execute("INSERT OR REPLACE INTO settings VALUES('notification', '0')")
    cursor.execute("INSERT OR REPLACE INTO settings VALUES('first_run', 'false')")
    conn.commit()
    conn.close()
    
    # Read the database file
    with open(tmp_path, 'rb') as f:
        db_content = f.read()
    
    # Clean up temp file
    os.unlink(tmp_path)
    
    # Upload to emulator's sdcard
    remote_temp_path = "/sdcard/superuser_nonotify.sqlite"
    upload_url = f"https://{target.identifier}:443/api/v1/files?path={urllib.parse.quote(remote_temp_path)}"
    
    upload_response = requests.put(
        upload_url,
        auth=(target.username, target.password),
        headers={"Content-Type": "application/octet-stream"},
        data=db_content,
        verify=False,
        timeout=30
    )
    
    if upload_response.status_code != 200:
        safe_print(f"{prefix}Failed to upload database: HTTP {upload_response.status_code}")
        return False
    
    # Copy to SuperUser app's data directory with correct ownership/permissions
    shell_url = f"https://{target.identifier}:443/api/v1/android/shell"
    headers = {"accept": "text/plain", "Content-Type": "application/json"}
    
    copy_cmd = (
        f"cp {remote_temp_path} /data/data/com.genymotion.superuser/databases/superuser.sqlite && "
        f"chown system:system /data/data/com.genymotion.superuser/databases/superuser.sqlite && "
        f"chmod 660 /data/data/com.genymotion.superuser/databases/superuser.sqlite && "
        f"rm -f {remote_temp_path}"
    )
    
    copy_response = requests.post(
        shell_url,
        auth=(target.username, target.password),
        json={"commands": [f"su -c '{copy_cmd}'"], "timeout_in_seconds": 10},
        headers=headers,
        verify=False
    )
    
    if copy_response.status_code == 200:
        safe_print(f"{prefix}SuperUser toasts disabled")
        return True
    else:
        safe_print(f"{prefix}Failed to copy database: HTTP {copy_response.status_code}")
        return False


def run_on_genymotion_targets(
    targets: List[EmulatorTarget],
    operation: callable,
    description: str,
    max_workers: int = None,
    show_summary: bool = True
) -> Dict[str, bool]:
    """
    Run an operation on multiple Genymotion targets in parallel.
    
    Args:
        targets: List of EmulatorTarget instances
        operation: Function to call for each target (takes EmulatorTarget, returns bool)
        description: Description for logging (e.g., "Enabling root access")
        max_workers: Max parallel workers (defaults to number of targets)
        show_summary: Whether to show success count summary
        
    Returns:
        Dict mapping target identifier to success status
    """
    geny_targets = [t for t in targets if t.backend_type == 'genymotion']
    
    if not geny_targets:
        return {}
    
    safe_print(f"\n{description} on {len(geny_targets)} Genymotion emulators...")
    safe_print("=" * 80)
    
    results = {}
    workers = max_workers or len(geny_targets)
    
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(operation, target): target
            for target in geny_targets
        }
        
        for future in as_completed(futures):
            target = futures[future]
            results[target.identifier] = future.result()
    
    if show_summary:
        successful = sum(1 for v in results.values() if v)
        safe_print(f"\n{description}: {successful}/{len(geny_targets)} successful")
    safe_print("=" * 80)
    
    return results


def unlock_emulator(target: EmulatorTarget) -> bool:
    """
    Unlock emulator screen by swiping up.
    
    This ensures the emulator is ready for app installation and interaction.
    
    Args:
        target: EmulatorTarget (must be genymotion type)
        
    Returns:
        True if successful, False otherwise
    """
    if target.backend_type != 'genymotion':
        return True  # Skip for ADB devices
    
    prefix = f"[{target.identifier}] "
    url = f"https://{target.identifier}:443/api/v1/android/shell"
    headers = {
        "accept": "text/plain",
        "Content-Type": "application/json"
    }
    
    safe_print(f"{prefix}Unlocking emulator screen...")
    
    # Wake up screen and swipe to unlock
    unlock_commands = [
        "input keyevent 82",           # Menu key (unlock)
    ]
    
    for cmd in unlock_commands:
        data = {
            "commands": [cmd],
            "timeout_in_seconds": 5
        }
        requests.post(
            url,
            auth=(target.username, target.password),
            json=data,
            headers=headers,
            verify=False
        )
        time.sleep(0.5)
    
    safe_print(f"{prefix}Emulator unlocked")
    return True


def setup_single_emulator(
    target: EmulatorTarget,
    apps: List[tuple],
    profile: str,
    data_path: Optional[str] = None,
    uninstall_only: bool = False,
    skip_install: bool = False,
    skip_open: bool = False,
    skip_env_setup: bool = False,
    verbose: bool = False,
    versions: Optional[Dict[str, str]] = None,
) -> SetupResult:
    """
    Set up a single emulator with the specified apps.
    
    Args:
        target: EmulatorTarget describing the emulator
        apps: List of (apk_path, bundle_id, app_name) tuples
        profile: Test profile to use for environment setup
        data_path: Optional custom path for state data
        uninstall_only: Only uninstall apps
        skip_install: Skip APK installation
        skip_open: Skip opening apps
        skip_env_setup: Skip environment setup
        verbose: Show detailed output
        versions: Optional dict of app_name -> min_version for post-install verification
        
    Returns:
        SetupResult with success/failure information
    """
    prefix = f"[{target.identifier}] "
    failed_apps = []
    success_count = 0
    
    try:
        safe_print(f"\n{prefix}Initializing {target.backend_type} backend...")
        backend = create_backend(target)
        
        safe_print(f"{prefix}Setting up {len(apps)} apps...")
        safe_print(f"{prefix}" + "=" * 60)
        
        for apk_path, bundle_id, app_name in apps:
            if apk_path:
                safe_print(f"\n{prefix}Processing: {app_name} ({apk_path.name})")
            else:
                safe_print(f"\n{prefix}Processing: {app_name} ({bundle_id})")
            safe_print(f"{prefix}" + "-" * 60)
            
            app_success = True
            
            # Step 1: Uninstall existing app
            if uninstall_only or not skip_install:
                safe_print(f"{prefix}  Uninstalling existing app (if any)...")
                uninstall_app(bundle_id, backend, prefix=prefix, verbose=verbose)
            
            if uninstall_only:
                success_count += 1
                safe_print(f"{prefix}  Done (uninstall only)")
                continue
            
            # Step 2: Install APK
            if not skip_install:
                safe_print(f"{prefix}  Installing APK...")
                install_result = install_apk(apk_path, backend, prefix=prefix, verbose=verbose)
                
                if not install_result:
                    safe_print(f"{prefix}  Failed to install {app_name}")
                    failed_apps.append((app_name, "installation failed"))
                    app_success = False
            else:
                safe_print(f"{prefix}  Skipping installation")
            
            # Step 2b: Verify installed version
            if app_success and versions and app_name in versions:
                min_version = versions[app_name]
                safe_print(f"{prefix}  Verifying installed version (>= {min_version})...")
                if not verify_installed_version(
                    backend, bundle_id, min_version, app_name, prefix=prefix
                ):
                    safe_print(f"{prefix}  WARNING: Version verification failed for {app_name}")
            
            # Step 3: Open app
            if app_success and not skip_open:
                safe_print(f"{prefix}  Opening app to activate...")
                if not open_app(bundle_id, backend, prefix=prefix, verbose=verbose):
                    safe_print(f"{prefix}  Failed to open {app_name}")
                    failed_apps.append((app_name, "failed to open"))
                    app_success = False
                time.sleep(3)
            elif skip_open:
                safe_print(f"{prefix}  Skipping app activation")
            
            # Step 4: Set environment
            if app_success and not skip_env_setup:
                if not setup_app_environment(bundle_id, profile, backend, prefix=prefix,
                                             data_path=data_path, verbose=verbose):
                    safe_print(f"{prefix}  Failed to set up environment for {app_name}")
                    failed_apps.append((app_name, "environment setup failed"))
                    app_success = False
                time.sleep(3)
            elif skip_env_setup:
                safe_print(f"{prefix}  Skipping environment setup")
            
            if app_success:
                success_count += 1
                safe_print(f"{prefix}  Successfully set up {app_name}")
        
        return SetupResult(
            target=target,
            success=len(failed_apps) == 0,
            apps_succeeded=success_count,
            apps_total=len(apps),
            failed_apps=failed_apps
        )
        
    except Exception as e:
        return SetupResult(
            target=target,
            success=False,
            apps_succeeded=success_count,
            apps_total=len(apps),
            failed_apps=failed_apps,
            error=str(e)
        )


def get_connected_adb_devices() -> List[str]:
    """
    Get list of connected ADB device serials.
    
    Returns:
        List of device serial strings
    """
    result = subprocess.run(
        ["adb", "devices"],
        capture_output=True,
        text=True
    )
    
    devices = []
    for line in result.stdout.strip().split('\n')[1:]:
        if '\t' in line:
            serial, status = line.split('\t')
            if status == 'device':
                devices.append(serial)
    
    return devices


def parse_targets_file(filepath: Path) -> List[EmulatorTarget]:
    """
    Parse targets from a JSON config file.
    
    Expected format:
    {
      "genymotion": {
        "username": "user",
        "password": "pass",
        "ips": ["ip1", "ip2"]
      },
      "adb": {
        "serials": ["serial1", "serial2"]
      }
    }
    
    Args:
        filepath: Path to JSON config file
        
    Returns:
        List of EmulatorTarget instances
    """
    with open(filepath) as f:
        config = json.load(f)
    
    targets = []
    
    if 'genymotion' in config:
        geny_config = config['genymotion']
        username = geny_config.get('username')
        password = geny_config.get('password')
        for ip in geny_config.get('ips', []):
            targets.append(EmulatorTarget(
                backend_type='genymotion',
                identifier=ip,
                username=username,
                password=password
            ))
    
    if 'adb' in config:
        adb_config = config['adb']
        for serial in adb_config.get('serials', []):
            targets.append(EmulatorTarget(
                backend_type='adb',
                identifier=serial
            ))
    
    return targets


def parse_targets(args) -> List[EmulatorTarget]:
    """
    Parse target emulators from command line arguments.
    
    Args:
        args: Parsed argparse namespace
        
    Returns:
        List of EmulatorTarget instances
    """
    targets = []
    
    # From targets file
    if args.targets_file:
        filepath = Path(args.targets_file)
        if not filepath.exists():
            raise FileNotFoundError(f"Targets file not found: {filepath}")
        targets.extend(parse_targets_file(filepath))
    
    # From --geny-ips
    if args.geny_ips:
        ips = [ip.strip() for ip in args.geny_ips.split(',')]
        username = args.geny_username or os.environ.get('GENY_USERNAME')
        password = args.geny_password or os.environ.get('GENY_PASSWORD')
        for ip in ips:
            targets.append(EmulatorTarget(
                backend_type='genymotion',
                identifier=ip,
                username=username,
                password=password
            ))
    
    # From --device-serials
    if args.device_serials:
        serials = [s.strip() for s in args.device_serials.split(',')]
        for serial in serials:
            targets.append(EmulatorTarget(
                backend_type='adb',
                identifier=serial
            ))
    
    # From --all-devices (auto-detect ADB devices)
    if args.all_devices:
        serials = get_connected_adb_devices()
        if not serials:
            raise RuntimeError("No ADB devices found. Make sure devices are connected and authorized.")
        for serial in serials:
            targets.append(EmulatorTarget(
                backend_type='adb',
                identifier=serial
            ))
    
    # Legacy single-device mode for backwards compatibility
    if not targets:
        if args.backend == 'genymotion':
            ip = args.geny_ip or os.environ.get('GENY_IP')
            username = args.geny_username or os.environ.get('GENY_USERNAME')
            password = args.geny_password or os.environ.get('GENY_PASSWORD')
            if ip:
                targets.append(EmulatorTarget(
                    backend_type='genymotion',
                    identifier=ip,
                    username=username,
                    password=password
                ))
            else:
                # Will use env vars in backend
                targets.append(EmulatorTarget(
                    backend_type='genymotion',
                    identifier=os.environ.get('GENY_IP', ''),
                    username=username,
                    password=password
                ))
        else:
            targets.append(EmulatorTarget(
                backend_type='adb',
                identifier=args.device_serial or ''
            ))
    
    return targets


def print_summary(results: List[SetupResult]):
    """Print summary of all emulator setup results."""
    print("\n" + "=" * 80)
    print("PARALLEL SETUP SUMMARY")
    print("=" * 80)
    
    total_emulators = len(results)
    successful_emulators = sum(1 for r in results if r.success)
    
    print(f"\nEmulators: {successful_emulators}/{total_emulators} successful")
    print("-" * 80)
    
    for result in results:
        status = "OK" if result.success else "FAILED"
        print(f"\n[{result.target.identifier}] {status}")
        print(f"  Apps: {result.apps_succeeded}/{result.apps_total}")
        
        if result.error:
            print(f"  Error: {result.error}")
        
        if result.failed_apps:
            print("  Failed apps:")
            for app_name, reason in result.failed_apps:
                print(f"    - {app_name}: {reason}")
    
    print("\n" + "=" * 80)


def main():
    """Main entry point for the setup script."""
    parser = argparse.ArgumentParser(
        description='Setup emulators with mock apps for experiments',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Single emulator - Install all apps (default behavior)
  python setup_emulator.py
  
  # Single emulator - Install specific apps
  python setup_emulator.py email pay music
  
  # Single emulator - Install exact versions from apk_versions.json lockfile
  python setup_emulator.py --from-lockfile
  
  # Single Genymotion emulator
  python setup_emulator.py --backend genymotion --geny-ip IP --geny-username USER --geny-password PASS
  
  # PARALLEL: Multiple Genymotion emulators
  python setup_emulator.py --geny-ips ip1,ip2,ip3 --geny-username USER --geny-password PASS --from-lockfile
  
  # PARALLEL: All connected ADB devices
  python setup_emulator.py --all-devices --from-lockfile
  
  # PARALLEL: Specific ADB devices
  python setup_emulator.py --device-serials emulator-5554,192.168.1.100:5555 --from-lockfile
  
  # PARALLEL: Using a targets config file
  python setup_emulator.py --targets-file emulators.json --from-lockfile

  # Skip auto-enabling root on Genymotion (if already enabled)
  python setup_emulator.py --targets-file emulators.json --skip-root --from-lockfile
  
  # Limit parallel workers
  python setup_emulator.py --all-devices --parallel 4 --from-lockfile
        """
    )
    
    parser.add_argument(
        'apps',
        nargs='*',
        help=f'Apps to install (Available: {", ".join(sorted(ALL_APPS))}'
    )
    
    parser.add_argument(
        '--backend',
        type=str,
        choices=['adb', 'genymotion'],
        default='adb',
        help='Backend to use for single-emulator mode (default: adb)'
    )
    
    # Single device arguments (backwards compatibility)
    parser.add_argument(
        '--device-serial',
        type=str,
        help='Device serial for ADB targeting (single device mode)'
    )
    
    parser.add_argument(
        '--geny-ip',
        type=str,
        help='Genymotion device IP for single device mode (can also use GENY_IP env var)'
    )
    
    # Parallel setup arguments
    parser.add_argument(
        '--geny-ips',
        type=str,
        help='Comma-separated list of Genymotion IPs for parallel setup'
    )
    
    parser.add_argument(
        '--device-serials',
        type=str,
        help='Comma-separated list of ADB device serials for parallel setup'
    )
    
    parser.add_argument(
        '--all-devices',
        action='store_true',
        help='Auto-detect and setup all connected ADB devices in parallel'
    )
    
    parser.add_argument(
        '--targets-file',
        type=str,
        help='Path to JSON config file with target emulators'
    )
    
    parser.add_argument(
        '--parallel',
        type=int,
        default=None,
        help='Max number of parallel workers (default: number of targets)'
    )
    
    parser.add_argument(
        '--skip-root',
        action='store_true',
        help='Skip enabling root access on Genymotion emulators (root is enabled by default)'
    )
    
    # Common arguments
    parser.add_argument(
        '--profile',
        type=str,
        default='default',
        help='Profile to use for set_environment (default: default)'
    )
    
    parser.add_argument(
        '--apk-dir',
        type=str,
        help='Directory containing APK files (default: auto-detect current_apps)'
    )
    
    parser.add_argument(
        '--from-lockfile',
        action='store_true',
        help='Use versions from apk_versions.json (ensures exact version match)'
    )
    
    default_data_path = str(Path(__file__).parent.parent / "digiworld" / "state_data")
    parser.add_argument(
        '--data-path',
        type=str,
        default=default_data_path,
        help=f'Path for state data (default: {default_data_path})'
    )
    
    parser.add_argument(
        '--uninstall-only',
        action='store_true',
        help='Only uninstall apps (do not install, open, or set environment)'
    )
    
    parser.add_argument(
        '--skip-install',
        action='store_true',
        help='Skip APK installation (only open apps and set environment)'
    )
    
    parser.add_argument(
        '--skip-open',
        action='store_true',
        help='Skip opening apps (only install and set environment)'
    )
    
    parser.add_argument(
        '--skip-env-setup',
        action='store_true',
        help='Skip environment setup (only install and open apps)'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show detailed output'
    )
    
    parser.add_argument(
        '--geny-username',
        type=str,
        help='Genymotion username (can also use GENY_USERNAME env var)'
    )
    
    parser.add_argument(
        '--geny-password',
        type=str,
        help='Genymotion password (can also use GENY_PASSWORD env var)'
    )
    
    args = parser.parse_args()
    
    try:
        # Parse targets
        targets = parse_targets(args)
        is_parallel = len(targets) > 1
        
        if is_parallel:
            print(f"Parallel mode: {len(targets)} emulators")
            for t in targets:
                print(f"  - {t}")
        
        # Enable root access on Genymotion emulators (default behavior, skip with --skip-root)
        if not args.skip_root:
            root_results = run_on_genymotion_targets(
                targets, enable_root_access, "Enabling root access", args.parallel
            )
            failed_root = [ip for ip, success in root_results.items() if not success]
            if failed_root:
                print(f"\nWarning: Failed to enable root on: {', '.join(failed_root)}")
                print("Setup will continue but may fail on these emulators.")
        
        # Unlock emulator screens (swipe up to dismiss lock screen)
        run_on_genymotion_targets(
            targets, unlock_emulator, "Unlocking screens", args.parallel, show_summary=False
        )
        
        # Disable SuperUser toast notifications (prevents interference with agent screenshots)
        run_on_genymotion_targets(
            targets, disable_superuser_toasts, "Disabling SuperUser toasts", args.parallel, show_summary=False
        )
        
        # Determine which apps to process
        app_names = args.apps if args.apps else ALL_APPS
        
        # Load lockfile versions if requested
        versions = None
        if args.from_lockfile:
            versions = load_lockfile()
            print(f"Using versions from apk_versions.json")
            if not args.apps:
                app_names = list(versions.keys())

        # For uninstall-only mode, we don't need APK files
        if args.uninstall_only:
            apps = []
            for app_name in app_names:
                if app_name in APP_CONFIG:
                    _, bundle_id, _ = APP_CONFIG[app_name]
                    apps.append((None, bundle_id, app_name))
                else:
                    print(f"Warning: Unknown app '{app_name}', skipping")
            
            if not apps:
                print("No valid apps specified!")
                return 1
            
            print(f"\nFound {len(apps)} apps to uninstall: {', '.join([name for _, _, name in apps])}")
        else:
            # Find APK directory
            if args.apk_dir:
                apk_dir = Path(args.apk_dir)
            else:
                apk_dir = find_apk_directory()
            
            print(f"Using APK directory: {apk_dir}")
        
            # Get list of apps
        apps = get_apps_to_install(apk_dir, app_names, versions)
        
        if not apps:
            print("No apps found to install!")
            return 1
        
        print(f"\nFound {len(apps)} apps to set up: {', '.join([name for _, _, name in apps])}")
        print("=" * 80)
        
        # Run setup
        if is_parallel:
            # Parallel execution
            max_workers = args.parallel or len(targets)
            results = []
            
            print(f"\nStarting parallel setup with {max_workers} workers...")
            
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {
                    executor.submit(
                        setup_single_emulator,
                        target=target,
                        apps=apps,
                        profile=args.profile,
                        data_path=args.data_path,
                        uninstall_only=args.uninstall_only,
                        skip_install=args.skip_install,
                        skip_open=args.skip_open,
                        skip_env_setup=args.skip_env_setup,
                        verbose=args.verbose,
                        versions=versions,
                    ): target
                    for target in targets
                }
                
                for future in as_completed(futures):
                    result = future.result()
                    results.append(result)
            
            # Print summary
            print_summary(results)
            
            # Return success only if all emulators succeeded
            return 0 if all(r.success for r in results) else 1
            
        else:
            # Single emulator mode (original behavior)
            target = targets[0]
            result = setup_single_emulator(
                target=target,
                apps=apps,
                profile=args.profile,
                data_path=args.data_path,
                uninstall_only=args.uninstall_only,
                skip_install=args.skip_install,
                skip_open=args.skip_open,
                skip_env_setup=args.skip_env_setup,
                verbose=args.verbose,
                versions=versions,
            )
            
            # Print summary
            print("\n" + "=" * 80)
            print("SETUP SUMMARY")
            print("=" * 80)
            print(f"Successfully set up: {result.apps_succeeded}/{result.apps_total} apps")
            
            if result.failed_apps:
                print(f"\nFailed apps:")
                for app_name, reason in result.failed_apps:
                    print(f"  - {app_name}: {reason}")
                return 1
            else:
                print("\nAll apps successfully set up!")
                print(f"Emulator is ready for experiments with profile: {args.profile}")
                return 0
        
    except Exception as e:
        print(f"\nError: {e}", file=sys.stderr)
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
