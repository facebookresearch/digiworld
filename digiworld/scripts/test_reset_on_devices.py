#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Test scenario reset across multiple devices in parallel.

For each device, iterates through all apps and verifies:
1. set_environment() succeeds with the default profile
2. The app reports ready status after reset

Usage:
    python scripts/test_reset_on_devices.py
    python scripts/test_reset_on_devices.py --apps email payment music
    python scripts/test_reset_on_devices.py --device emulator-5554
"""

import argparse
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Dict, List, Optional, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from digiworld.adb.actions import ADBActions
from digiworld.adb.backends import ADBBackend
from digiworld.app_registry import get_all_app_names, get_bundle_id
import digiworld


def get_connected_devices() -> List[str]:
    result = subprocess.run(["adb", "devices"], capture_output=True, text=True)
    devices = []
    for line in result.stdout.strip().split("\n")[1:]:
        if "\t" in line:
            serial, status = line.split("\t")
            if status == "device":
                devices.append(serial)
    return devices


def test_app_reset(
    device_serial: str,
    app_name: str,
    profile: str = "default",
) -> Dict:
    """Test resetting a single app on a single device."""
    bundle_id = get_bundle_id(app_name)
    if not bundle_id:
        return {"app": app_name, "device": device_serial, "ok": False, "error": "unknown app"}

    state_data = digiworld.get_state_data_path()
    backend = ADBBackend(device_serial=device_serial)

    try:
        adb = ADBActions(bundle_id=bundle_id, custom_path=state_data, backend=backend)
        result = adb.set_environment(data_id=profile)
        if not result:
            return {"app": app_name, "device": device_serial, "ok": False, "error": "set_environment returned False"}

        adb.wait_for_ready(max_wait_time=30)
        status = adb.is_ready()
        if not status or not status.get("isAppReady"):
            return {"app": app_name, "device": device_serial, "ok": False, "error": f"app not ready: {status}"}

        return {"app": app_name, "device": device_serial, "ok": True}

    except Exception as e:
        return {"app": app_name, "device": device_serial, "ok": False, "error": str(e)}


def test_device(device_serial: str, app_names: List[str], profile: str) -> List[Dict]:
    """Test all apps on a single device sequentially."""
    results = []
    for app_name in app_names:
        print(f"  [{device_serial}] Testing {app_name}...")
        r = test_app_reset(device_serial, app_name, profile)
        status = "OK" if r["ok"] else f"FAIL: {r.get('error', '?')}"
        print(f"  [{device_serial}] {app_name}: {status}")
        results.append(r)
    return results


def main():
    parser = argparse.ArgumentParser(description="Test scenario reset across devices")
    parser.add_argument("--apps", nargs="+", default=None, help="Apps to test (default: all)")
    parser.add_argument("--device", type=str, default=None, help="Single device serial (default: all connected)")
    parser.add_argument("--profile", type=str, default="default", help="Profile to use (default: default)")
    args = parser.parse_args()

    app_names = args.apps or sorted(get_all_app_names())

    if args.device:
        devices = [args.device]
    else:
        devices = get_connected_devices()
        if not devices:
            print("No devices connected!")
            return 1

    print(f"Devices: {len(devices)}")
    print(f"Apps: {len(app_names)}")
    print(f"Profile: {args.profile}")

    # Distribute apps across devices round-robin
    device_assignments: Dict[str, List[str]] = {d: [] for d in devices}
    for i, app in enumerate(app_names):
        device = devices[i % len(devices)]
        device_assignments[device].append(app)

    for d, apps in device_assignments.items():
        print(f"  {d}: {', '.join(apps)}")

    print("\n" + "=" * 60)

    # Run tests in parallel (one thread per device)
    all_results = []
    with ThreadPoolExecutor(max_workers=len(devices)) as executor:
        futures = {
            executor.submit(test_device, device, apps, args.profile): device
            for device, apps in device_assignments.items()
        }
        for future in as_completed(futures):
            all_results.extend(future.result())

    # Summary
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)

    passed = sum(1 for r in all_results if r["ok"])
    failed = [r for r in all_results if not r["ok"]]

    print(f"\nPassed: {passed}/{len(all_results)}")
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for r in failed:
            print(f"  {r['app']} on {r['device']}: {r.get('error', '?')}")
        return 1
    else:
        print("\nAll tests passed!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
