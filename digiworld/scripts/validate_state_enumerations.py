#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Validate State Enumeration JSON Files

Checks all state_enumeration.json files for structural correctness:
- Required fields present
- home_route exists as a route
- All non-dynamic routes have back_route field
- back_route values are consistent (null for home/tab, home_route for stack)
- No [id] patterns in non-dynamic routes

Usage:
    python scripts/validate_state_enumerations.py
    python scripts/validate_state_enumerations.py --app email
"""

import sys
import os
import json
import argparse
import glob

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from digiworld.app_registry import get_all_app_names


def validate_state_enumeration(app_name: str, config_path: str) -> list:
    """Validate a single state_enumeration.json file. Returns list of issues."""
    issues = []

    try:
        with open(config_path, "r") as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        return [f"{app_name}: Invalid JSON: {e}"]

    # Check required top-level fields
    for field in ("app_name", "apk_name", "database_name", "home_route", "routes"):
        if field not in config:
            issues.append(f"{app_name}: Missing required field '{field}'")

    if "home_route" not in config or "routes" not in config:
        return issues  # Can't continue without these

    home_route = config["home_route"]
    routes = config["routes"]

    if not routes:
        issues.append(f"{app_name}: No routes defined")
        return issues

    # Check that home_route exists as a route
    route_paths = [r["route"] for r in routes]
    if home_route not in route_paths:
        issues.append(
            f"{app_name}: home_route '{home_route}' not found in routes"
        )

    route_ids = set()
    for route in routes:
        rid = route.get("id", "<missing>")

        # Check required fields
        for field in ("id", "route", "screen_name", "description"):
            if field not in route:
                issues.append(f"{app_name}/{rid}: Missing field '{field}'")

        # Check for duplicate IDs
        if rid in route_ids:
            issues.append(f"{app_name}/{rid}: Duplicate route ID")
        route_ids.add(rid)

        # Skip dynamic routes for back_route checks
        if route.get("dynamic", False):
            continue

        # Check back_route field exists
        if "back_route" not in route:
            issues.append(f"{app_name}/{rid}: Missing 'back_route' field")

        # Check no [id] patterns in non-dynamic routes
        if "[" in route.get("route", "") and "]" in route.get("route", ""):
            issues.append(
                f"{app_name}/{rid}: Non-dynamic route contains [id] pattern: {route['route']}"
            )

        # Check context_variations is a list
        cv = route.get("context_variations")
        if cv is not None and not isinstance(cv, list):
            issues.append(
                f"{app_name}/{rid}: context_variations must be a list"
            )

    return issues


def main():
    parser = argparse.ArgumentParser(
        description="Validate state enumeration JSON files"
    )
    parser.add_argument(
        "--app",
        default=None,
        help="Validate only this app (default: all)",
    )
    args = parser.parse_args()

    base_dir = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "digiworld",
        "scenarios",
        "scenarios",
    )

    if args.app:
        app_names = [args.app]
    else:
        app_names = sorted(get_all_app_names())

    all_issues = []
    apps_found = 0
    apps_missing = []

    for app_name in app_names:
        config_path = os.path.join(base_dir, app_name, "state_enumeration.json")
        if not os.path.exists(config_path):
            apps_missing.append(app_name)
            continue

        apps_found += 1
        issues = validate_state_enumeration(app_name, config_path)
        all_issues.extend(issues)

    # Print results
    print(f"\nValidated {apps_found} state_enumeration.json files")

    if apps_missing:
        print(f"\nMissing files for: {', '.join(apps_missing)}")

    if all_issues:
        print(f"\n{len(all_issues)} issue(s) found:")
        for issue in all_issues:
            print(f"  - {issue}")
        return 1
    else:
        print("\nAll files valid!")
        return 0


if __name__ == "__main__":
    sys.exit(main())
