# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Backend utilities for emulator tests.

This module provides utility functions for:
- Creating backend instances based on environment configuration
- Waiting for emulator readiness
- Querying device state
- Managing test paths
"""

import os
import sys
import time
import subprocess
import logging
from pathlib import Path
from typing import Optional, List, Dict, Any

# Add paths to import from the project modules
_REPO_ROOT = Path(__file__).parent.parent.parent
_ADB_API_PATH = _REPO_ROOT / "digiworld"
_DIGIWORLD_PATH = _REPO_ROOT / "digiworld"

if str(_ADB_API_PATH) not in sys.path:
    sys.path.insert(0, str(_ADB_API_PATH))
if str(_DIGIWORLD_PATH) not in sys.path:
    sys.path.insert(0, str(_DIGIWORLD_PATH))

from digiworld.adb.backends import EmulatorBackend, ADBBackend, GenymotionBackend

logger = logging.getLogger(__name__)


# Environment variable names
ENV_BACKEND = "EMULATOR_BACKEND"
ENV_GENY_IP = "GENY_IP"
ENV_GENY_USERNAME = "GENY_USERNAME"
ENV_GENY_PASSWORD = "GENY_PASSWORD"
ENV_TEST_APPS = "EMULATOR_TEST_APPS"
ENV_TEST_TIMEOUT = "EMULATOR_TEST_TIMEOUT"
ENV_SKIP_INSTALL = "EMULATOR_TEST_SKIP_INSTALL"


# Default configuration
DEFAULT_TIMEOUT = 300  # 5 minutes
DEFAULT_POLL_INTERVAL = 2  # seconds


def get_backend_type() -> str:
    """
    Get the backend type from environment variables.

    Returns:
        str: Either 'adb' or 'genymotion'
    """
    return os.environ.get(ENV_BACKEND, "adb").lower()


def get_backend_from_env() -> EmulatorBackend:
    """
    Create an EmulatorBackend instance based on environment configuration.

    Environment variables:
        EMULATOR_BACKEND: 'adb' or 'genymotion' (default: 'adb')
        GENY_IP: Genymotion device IP (required for genymotion)
        GENY_USERNAME: Genymotion username (required for genymotion)
        GENY_PASSWORD: Genymotion password (required for genymotion)

    Returns:
        EmulatorBackend: Configured backend instance

    Raises:
        ValueError: If genymotion backend is selected but credentials are missing
    """
    backend_type = get_backend_type()

    if backend_type == "genymotion":
        # Check for required environment variables
        geny_ip = os.environ.get(ENV_GENY_IP)
        geny_username = os.environ.get(ENV_GENY_USERNAME)
        geny_password = os.environ.get(ENV_GENY_PASSWORD)

        if not all([geny_ip, geny_username, geny_password]):
            missing = []
            if not geny_ip:
                missing.append(ENV_GENY_IP)
            if not geny_username:
                missing.append(ENV_GENY_USERNAME)
            if not geny_password:
                missing.append(ENV_GENY_PASSWORD)
            raise ValueError(
                f"Genymotion backend requires environment variables: {', '.join(missing)}"
            )

        return GenymotionBackend(use_env_variables=True)
    else:
        return ADBBackend()


def is_adb_available() -> bool:
    """
    Check if ADB is available in the system PATH.

    Returns:
        bool: True if ADB is available, False otherwise
    """
    try:
        result = subprocess.run(
            ["adb", "version"],
            capture_output=True,
            text=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, FileNotFoundError):
        return False


def is_device_connected(backend: Optional[EmulatorBackend] = None) -> bool:
    """
    Check if an Android device/emulator is connected.

    Args:
        backend: Optional backend instance. If None, uses ADB directly.

    Returns:
        bool: True if a device is connected, False otherwise
    """
    if backend is None or isinstance(backend, ADBBackend):
        try:
            result = subprocess.run(
                ["adb", "devices"],
                capture_output=True,
                text=True,
                timeout=10
            )
            # Parse output: first line is "List of devices attached"
            # Following lines are "device_id\tstate"
            lines = result.stdout.strip().split('\n')
            for line in lines[1:]:
                if '\tdevice' in line:
                    return True
            return False
        except (subprocess.TimeoutExpired, FileNotFoundError):
            return False
    elif isinstance(backend, GenymotionBackend):
        # For Genymotion, try a simple shell command
        try:
            result = backend.execute_command("echo test", is_shell=True)
            return result is not None
        except Exception:
            return False
    return False


def wait_for_emulator(
    backend: EmulatorBackend,
    timeout: int = 60,
    poll_interval: int = 2
) -> bool:
    """
    Wait for the emulator to be ready.

    Args:
        backend: The emulator backend to use
        timeout: Maximum time to wait in seconds
        poll_interval: Time between checks in seconds

    Returns:
        bool: True if emulator became ready, False if timeout
    """
    start_time = time.time()

    while (time.time() - start_time) < timeout:
        if is_device_connected(backend):
            # Additional check: verify shell commands work
            try:
                result = backend.execute_command("echo ready", is_shell=True)
                if result is not None or isinstance(backend, ADBBackend):
                    return True
            except Exception:
                pass

        time.sleep(poll_interval)

    return False


def get_installed_packages(backend: EmulatorBackend) -> List[str]:
    """
    Get list of installed packages on the device.

    Args:
        backend: The emulator backend to use

    Returns:
        List[str]: List of package names
    """
    try:
        if isinstance(backend, ADBBackend):
            result = subprocess.run(
                ["adb", "shell", "pm", "list", "packages"],
                capture_output=True,
                text=True,
                timeout=30
            )
            if result.returncode == 0:
                packages = []
                for line in result.stdout.strip().split('\n'):
                    if line.startswith('package:'):
                        packages.append(line[8:])  # Remove 'package:' prefix
                return packages
        else:
            result = backend.execute_command("pm list packages", is_shell=True)
            if result:
                content = result.decode('utf-8') if isinstance(result, bytes) else result
                packages = []
                for line in content.strip().split('\n'):
                    if line.startswith('package:'):
                        packages.append(line[8:])
                return packages
    except Exception as e:
        logger.warning(f"Failed to get installed packages: {e}")

    return []


def is_package_installed(backend: EmulatorBackend, package_name: str) -> bool:
    """
    Check if a specific package is installed.

    Args:
        backend: The emulator backend to use
        package_name: The package name to check

    Returns:
        bool: True if package is installed
    """
    packages = get_installed_packages(backend)
    return package_name in packages


def get_test_apps() -> List[str]:
    """
    Get the list of apps to test based on environment configuration.

    Environment variables:
        EMULATOR_TEST_APPS: Comma-separated list of app names (e.g., "email,payment,eats")

    Returns:
        List[str]: List of app names to test. If not configured, returns all apps.
    """
    from app_config import ALL_APPS

    apps_env = os.environ.get(ENV_TEST_APPS)
    if apps_env:
        return [app.strip() for app in apps_env.split(',')]
    return ALL_APPS


def get_test_timeout() -> int:
    """
    Get the test timeout from environment configuration.

    Returns:
        int: Timeout in seconds
    """
    try:
        return int(os.environ.get(ENV_TEST_TIMEOUT, str(DEFAULT_TIMEOUT)))
    except ValueError:
        return DEFAULT_TIMEOUT


def should_skip_install() -> bool:
    """
    Check if app installation should be skipped.

    Returns:
        bool: True if installation should be skipped
    """
    return os.environ.get(ENV_SKIP_INSTALL, "").lower() in ("true", "1", "yes")


def get_project_paths() -> Dict[str, Path]:
    """
    Get important project paths.

    Returns:
        Dict with keys:
            - repo_root: Repository root directory
            - adb_api: digiworld directory
            - digiworld: digiworld directory
            - state_data: state_data directory
            - current_apps: APK directory
    """
    repo_root = _REPO_ROOT

    return {
        "repo_root": repo_root,
        "adb_api": repo_root / "digiworld",
        "digiworld": repo_root / "digiworld",
        "state_data": repo_root / "digiworld" / "digiworld" / "state_data",
        "current_apps": repo_root / "digiworld" / "current_apps",
    }


def find_apk_for_app(app_name: str) -> Optional[Path]:
    """
    Find the APK file for a specific app.

    Args:
        app_name: The app name (e.g., 'email', 'payment')

    Returns:
        Path to the APK file, or None if not found
    """
    from app_config import get_release_tag_pattern

    paths = get_project_paths()
    apk_dir = paths["current_apps"]

    if not apk_dir.exists():
        logger.warning(f"APK directory not found: {apk_dir}")
        return None

    tag_pattern = get_release_tag_pattern(app_name)

    # Try different patterns
    patterns = [
        f"{tag_pattern}-*-release.apk",
        f"{tag_pattern}-*.apk",
        f"{tag_pattern}*.apk",
    ]

    for pattern in patterns:
        matches = list(apk_dir.glob(pattern))
        if matches:
            # Return most recently modified
            return max(matches, key=lambda p: p.stat().st_mtime)

    return None


def get_device_info(backend: EmulatorBackend) -> Dict[str, Any]:
    """
    Get device information for debugging/logging.

    Args:
        backend: The emulator backend to use

    Returns:
        Dict with device information
    """
    info = {
        "backend_type": type(backend).__name__,
        "connected": is_device_connected(backend),
    }

    if isinstance(backend, ADBBackend):
        try:
            # Get device model
            result = subprocess.run(
                ["adb", "shell", "getprop", "ro.product.model"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                info["model"] = result.stdout.strip()

            # Get Android version
            result = subprocess.run(
                ["adb", "shell", "getprop", "ro.build.version.release"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                info["android_version"] = result.stdout.strip()

            # Get SDK version
            result = subprocess.run(
                ["adb", "shell", "getprop", "ro.build.version.sdk"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                info["sdk_version"] = result.stdout.strip()

        except Exception as e:
            info["error"] = str(e)

    return info
