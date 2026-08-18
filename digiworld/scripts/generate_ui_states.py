#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Generate UI State Rootstores

This script generates UI state rootstore files for all apps and profiles by
enumerating the non-data-dependent (static) routes defined in each app's
state_enumeration.json configuration.

Output is written to:
    state_data/{bundle_id}/.ui_states/{profile_name}/

Usage:
    python scripts/generate_ui_states.py --all                      # all apps, all profiles
    python scripts/generate_ui_states.py --all email                # all profiles for one app
    python scripts/generate_ui_states.py email default              # single profile
    python scripts/generate_ui_states.py --all --dry-run
"""

import sys
import os
import argparse
import logging
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import digiworld
from digiworld.app_registry import get_app_to_bundle_mapping
from digiworld.profile_variants import is_variant
from digiworld.scenarios.state_enumerator import StateEnumerator


def _resolve_bundle_id(app_name: str) -> str:
    mapping = get_app_to_bundle_mapping()
    return mapping.get(app_name, f"com.andojo{app_name}.sbx")


def _list_base_profiles(app_state_dir: str) -> list:
    """Return names of base (non-variant) profile directories."""
    profiles = []
    for item in sorted(Path(app_state_dir).iterdir()):
        if not item.is_dir() or item.name.startswith("."):
            continue
        if is_variant(str(item)):
            continue
        if (item / "sessions" / "default").exists():
            profiles.append(item.name)
    return profiles


def generate_ui_states(
    app_name: str,
    base_profile: str,
    dry_run: bool = False,
    logger: logging.Logger = None,
) -> list:
    """Generate UI state rootstores for a single app + profile.

    Args:
        app_name: App name (e.g. ``"email"``).
        base_profile: Base profile name (e.g. ``"default"``).
        dry_run: If ``True``, only log what would be generated.
        logger: Logger instance.

    Returns:
        List of dicts describing generated state files.
    """
    logger = logger or logging.getLogger(__name__)

    state_data_path = digiworld.get_state_data_path().rstrip("/")
    bundle_id = _resolve_bundle_id(app_name)
    package_dir = str(digiworld.get_package_dir())

    profile_path = os.path.join(state_data_path, bundle_id, base_profile)
    if not os.path.exists(profile_path):
        raise FileNotFoundError(f"Profile not found: {profile_path}")

    output_dir = os.path.join(state_data_path, bundle_id, ".ui_states", base_profile)

    if dry_run:
        logger.info(
            f"Would generate UI states for {base_profile} ({bundle_id}) -> {output_dir}"
        )
        return []

    logger.info(f"Generating UI states for {base_profile} ({bundle_id})")

    try:
        enumerator = StateEnumerator(app_name, logger=logger)
    except FileNotFoundError:
        logger.warning(
            f"No state_enumeration.json for {app_name}, skipping"
        )
        return []

    states = enumerator.enumerate_states(
        profile_path=profile_path,
        output_dir=output_dir,
        include_dynamic=False,
    )

    results = []
    for state in states:
        results.append({
            "route_id": state["route_id"],
            "route": state["route"],
            "profile": base_profile,
            "filename": f"{state['route_id']}_var{state['variation_index']}.json",
        })

    logger.info(f"Generated {len(results)} state(s) for {base_profile}")
    return results


def main():
    parser = argparse.ArgumentParser(
        description="Generate UI state rootstores for apps and profiles",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # All apps, all profiles
  python scripts/generate_ui_states.py --all

  # All profiles for a single app
  python scripts/generate_ui_states.py --all email

  # Single profile
  python scripts/generate_ui_states.py email default

  # Dry run
  python scripts/generate_ui_states.py --all --dry-run
        """,
    )

    parser.add_argument(
        "app_name",
        nargs="?",
        default=None,
        help="Name of the app (e.g. email, transit). Omit with --all for all apps.",
    )
    parser.add_argument(
        "base_profile",
        nargs="?",
        default=None,
        help="Base profile name. Omit with --all for all profiles.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        dest="all_profiles",
        help="Process all base profiles. If app_name is omitted, processes all apps.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be generated without actually generating.",
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Enable verbose debug logging.",
    )

    args = parser.parse_args()

    level = logging.DEBUG if args.verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    log = logging.getLogger(__name__)

    if not args.all_profiles and not args.base_profile:
        parser.error("Provide a base_profile name or use --all.")
    if not args.all_profiles and not args.app_name:
        parser.error("Provide an app_name or use --all.")

    state_data_path = digiworld.get_state_data_path().rstrip("/")

    # Determine which apps to process
    if args.app_name:
        app_names = [args.app_name]
    else:
        from digiworld.app_registry import get_all_app_names
        app_names = sorted(get_all_app_names())
        log.info(f"Processing all {len(app_names)} apps")

    total_generated = 0

    for app_name in app_names:
        bundle_id = _resolve_bundle_id(app_name)
        app_state_dir = os.path.join(state_data_path, bundle_id)

        if not os.path.isdir(app_state_dir):
            log.warning(f"No state_data for {app_name} ({bundle_id}), skipping")
            continue

        if args.all_profiles:
            profiles = _list_base_profiles(app_state_dir)
            if not profiles:
                log.warning(f"No base profiles for {app_name}, skipping")
                continue
        else:
            profiles = [args.base_profile]

        app_generated = []
        for profile in profiles:
            try:
                generated = generate_ui_states(
                    app_name=app_name,
                    base_profile=profile,
                    dry_run=args.dry_run,
                    logger=log,
                )
                app_generated.extend(generated)
            except FileNotFoundError as e:
                log.warning(str(e))
            except Exception as e:
                log.error(f"Error generating states for {app_name}/{profile}: {e}")

        if not args.dry_run and app_generated:
            print(f"\n  {app_name} ({bundle_id}): {len(app_generated)} state(s)")
            by_profile = {}
            for s in app_generated:
                by_profile.setdefault(s["profile"], []).append(s)
            for profile, states in sorted(by_profile.items()):
                print(f"    {profile}: {len(states)} state(s)")

        total_generated += len(app_generated)

    if not args.dry_run:
        print(f"\n{'='*60}")
        print(f"Total: {total_generated} UI state rootstore(s) generated")
        print(f"{'='*60}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
