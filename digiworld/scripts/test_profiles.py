#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Interactive script to test profiles on the emulator via set_environment.

Loads each profile into a fresh app instance and waits for confirmation
before moving to the next, so you can visually verify the data on the
emulator.

Usage:
    python scripts/test_profiles.py                  # Test all apps with profiles
    python scripts/test_profiles.py banking          # Test only banking
    python scripts/test_profiles.py banking parking  # Test banking and parking
    python scripts/test_profiles.py --timeout 60     # Custom timeout (default: 45s)
    python scripts/test_profiles.py --list           # List available apps and profiles
"""

import os
import signal
import subprocess
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(
    0,
    os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "..",
        "python-agent-to-app-interaction-api",
    ),
)

import digiworld
from digiworld.app_registry import get_app_to_bundle_mapping
from adb_actions import ADBActions

STATE_DATA = digiworld.get_state_data_path().rstrip("/")
APP_LAUNCH_SLEEP = 3.0
DEFAULT_TIMEOUT = 45


class _Timeout(Exception):
    pass


def _timeout_handler(signum, frame):
    raise _Timeout("set_environment timed out")


def _is_complete_profile(profile_dir: str) -> bool:
    """A profile is complete if it has mockdata JSON files and a default session."""
    mockdata = os.path.join(profile_dir, "mockdata")
    session = os.path.join(profile_dir, "sessions", "default")
    has_mockdata = os.path.isdir(mockdata) and any(
        f.endswith(".json") for f in os.listdir(mockdata)
    )
    has_session = os.path.isdir(session) and os.path.exists(
        os.path.join(session, "rootstore.json")
    )
    return has_mockdata and has_session


def discover_profiles(bundle_id: str) -> list[str]:
    app_dir = os.path.join(STATE_DATA, bundle_id)
    if not os.path.isdir(app_dir):
        raise FileNotFoundError(f"No state_data directory for {bundle_id}: {app_dir}")
    return sorted(
        entry
        for entry in os.listdir(app_dir)
        if os.path.isdir(os.path.join(app_dir, entry))
        and not entry.startswith(".")
        and _is_complete_profile(os.path.join(app_dir, entry))
    )


def _get_all_apps() -> dict[str, str]:
    """Build {app_name: bundle_id} from the digiworld registry, keeping only
    apps that have at least one complete profile in state_data."""
    mapping = get_app_to_bundle_mapping()
    apps: dict[str, str] = {}
    for name, bundle_id in sorted(mapping.items()):
        app_dir = os.path.join(STATE_DATA, bundle_id)
        if not os.path.isdir(app_dir):
            continue
        has_profiles = any(
            _is_complete_profile(os.path.join(app_dir, d))
            for d in os.listdir(app_dir)
            if os.path.isdir(os.path.join(app_dir, d)) and not d.startswith(".")
        )
        if has_profiles:
            apps[name] = bundle_id
    return apps


def _restart_app(bundle_id: str) -> None:
    """Force-stop and relaunch the app, matching the RL training loop."""
    subprocess.run(["adb", "shell", "am", "force-stop", bundle_id], capture_output=True)
    subprocess.run(
        ["adb", "shell", "monkey", "-p", bundle_id,
         "-c", "android.intent.category.LAUNCHER", "1"],
        capture_output=True,
    )
    time.sleep(APP_LAUNCH_SLEEP)


def _load_profile(adb: ADBActions, bundle_id: str, profile: str, timeout: int) -> str:
    """Restart the app, load the profile, return 'ok' / 'failed' / 'timeout'."""
    print(f"  Restarting {bundle_id}...")
    _restart_app(bundle_id)

    old_handler = signal.signal(signal.SIGALRM, _timeout_handler)
    signal.alarm(timeout)
    try:
        result = adb.set_environment(data_id=profile)
        signal.alarm(0)
        return "ok" if result else "failed"
    except _Timeout:
        return "timeout"
    except Exception as exc:
        signal.alarm(0)
        print(f"  ERROR: {exc}")
        return "failed"
    finally:
        signal.signal(signal.SIGALRM, old_handler)


def _test_app(app_label: str, bundle_id: str, timeout: int) -> dict:
    profiles = discover_profiles(bundle_id)
    print(f"\n{'=' * 60}")
    print(f"  {app_label.upper()} ({bundle_id})")
    print(f"  {len(profiles)} profiles | timeout: {timeout}s per profile")
    print(f"{'=' * 60}")

    adb = ADBActions(bundle_id=bundle_id, custom_path=STATE_DATA)
    results: dict[str, list[str]] = {"ok": [], "failed": [], "timeout": [], "skipped": []}

    for i, profile in enumerate(profiles, 1):
        print(f"\n[{i}/{len(profiles)}] Loading profile: {profile}")
        status = _load_profile(adb, bundle_id, profile, timeout)

        if status == "ok":
            print("  -> OK")
        elif status == "timeout":
            print(f"  -> TIMED OUT after {timeout}s")
        else:
            print("  -> FAILED")

        results[status].append(profile)

        response = input("  Press Enter for next, 's' to skip rest of app, 'q' to quit: ").strip().lower()
        if response == "q":
            results["skipped"].extend(profiles[i:])
            print("\nQuitting.")
            _print_summary(app_label, results)
            sys.exit(0)
        if response == "s":
            results["skipped"].extend(profiles[i:])
            break

    _print_summary(app_label, results)
    return results


def _print_summary(app_label: str, results: dict) -> None:
    print(f"\n--- {app_label.upper()} Summary ---")
    print(f"  OK:      {len(results['ok'])}")
    print(f"  Failed:  {len(results['failed'])}")
    print(f"  Timeout: {len(results['timeout'])}")
    print(f"  Skipped: {len(results['skipped'])}")
    if results["failed"]:
        print(f"  Failed profiles:  {', '.join(results['failed'])}")
    if results["timeout"]:
        print(f"  Timeout profiles: {', '.join(results['timeout'])}")


def _cmd_list() -> None:
    """Print available apps and their complete profiles."""
    apps = _get_all_apps()
    if not apps:
        print("No apps with complete profiles found.")
        return
    total = 0
    for name, bundle_id in apps.items():
        profiles = discover_profiles(bundle_id)
        total += len(profiles)
        print(f"  {name} ({bundle_id}): {len(profiles)} profiles")
        for p in profiles:
            print(f"    - {p}")
        print()
    print(f"Total: {total} profiles across {len(apps)} apps")


def main() -> None:
    timeout = DEFAULT_TIMEOUT
    app_names: list[str] = []
    args = sys.argv[1:]

    i = 0
    while i < len(args):
        if args[i] == "--timeout":
            if i + 1 >= len(args):
                raise ValueError("--timeout requires a value")
            timeout = int(args[i + 1])
            i += 2
        elif args[i] == "--list":
            _cmd_list()
            return
        else:
            app_names.append(args[i])
            i += 1

    all_apps = _get_all_apps()

    if app_names:
        apps: dict[str, str] = {}
        for label in app_names:
            if label not in all_apps:
                raise ValueError(
                    f"Unknown app: {label}. "
                    f"Available: {', '.join(sorted(all_apps.keys()))}"
                )
            apps[label] = all_apps[label]
    else:
        apps = all_apps

    total_profiles = 0
    for label, bundle_id in apps.items():
        profiles = discover_profiles(bundle_id)
        total_profiles += len(profiles)
        print(f"  {label}: {len(profiles)} profiles")

    print(f"\nTotal: {total_profiles} profiles across {len(apps)} apps")
    print(f"Timeout: {timeout}s per profile")
    print("Make sure the emulator is running (app will be restarted per profile).")
    input("Press Enter to start testing...\n")

    all_results: dict[str, dict] = {}
    for label, bundle_id in apps.items():
        all_results[label] = _test_app(label, bundle_id, timeout)

    print(f"\n{'=' * 60}")
    print("  FINAL RESULTS")
    print(f"{'=' * 60}")
    for label, results in all_results.items():
        _print_summary(label, results)


if __name__ == "__main__":
    main()
