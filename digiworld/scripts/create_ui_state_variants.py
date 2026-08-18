#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Create Profile Variants from UI States

This script creates profile variants that share the same database and mockdata
as a base profile but have different rootstore.json files representing distinct
UI states (screens / tabs).

Each variant is named: {base_profile}-uistate_{state_id}
And has symlinks to the original data, with only rootstore.json being different.

The home state (whose route matches the app's home_route) is skipped because
the base profile already represents that state.

UI state rootstores are read from:
    state_data/{bundle_id}/.ui_states/{profile_name}/

Usage:
    python scripts/create_ui_state_variants.py --all                        # all apps, all profiles
    python scripts/create_ui_state_variants.py --all email                  # all profiles for one app
    python scripts/create_ui_state_variants.py email default                # single profile
    python scripts/create_ui_state_variants.py email default --states compose_var0
    python scripts/create_ui_state_variants.py --all --dry-run
"""

import sys
import os
import json
import shutil
import argparse
import logging
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import digiworld
from digiworld.app_registry import get_app_to_bundle_mapping
from digiworld.profile_variants import (
    is_variant,
    write_variant_marker,
)


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


def _load_home_route(app_name: str) -> str:
    """Load the home_route from the app's state_enumeration.json."""
    config_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "digiworld",
        "scenarios",
        "scenarios",
        app_name,
        "state_enumeration.json",
    )
    if not os.path.exists(config_path):
        return None
    with open(config_path, "r") as f:
        config = json.load(f)
    return config.get("home_route")


def _is_home_state(state_info: dict, home_route: str) -> bool:
    """Return True if this state represents the home screen."""
    if home_route is None:
        return False
    route = state_info.get("route", "")
    if route == home_route:
        return True
    return False


def create_ui_state_variants(
    app_name: str,
    base_profile: str,
    selected_states: list = None,
    dry_run: bool = False,
    logger: logging.Logger = None,
) -> list:
    """Create UI state variants for a single base profile.

    Args:
        app_name: App name (e.g. ``"email"``).
        base_profile: Base profile name (e.g. ``"default"``).
        selected_states: Restrict to these state IDs (``None`` = all).
        dry_run: If ``True``, only log what would be created.
        logger: Logger instance.

    Returns:
        List of dicts describing created variants.
    """
    logger = logger or logging.getLogger(__name__)

    state_data_path = digiworld.get_state_data_path().rstrip("/")
    bundle_id = _resolve_bundle_id(app_name)

    base_profile_path = os.path.join(state_data_path, bundle_id, base_profile)
    if not os.path.exists(base_profile_path):
        raise FileNotFoundError(f"Base profile not found: {base_profile_path}")

    # UI states directory (inside state_data alongside .themes)
    ui_states_path = os.path.join(state_data_path, bundle_id, ".ui_states", base_profile)
    if not os.path.exists(ui_states_path):
        raise FileNotFoundError(
            f"UI states not found for {base_profile}. "
            f"Run: python scripts/generate_ui_states.py {app_name} {base_profile}"
        )

    # Load state summary
    summary_file = os.path.join(ui_states_path, "_state_summary.json")
    if not os.path.exists(summary_file):
        raise FileNotFoundError(f"State summary not found: {summary_file}")

    with open(summary_file, "r") as f:
        state_summary = json.load(f)

    # Load home route to determine which state to skip
    home_route = _load_home_route(app_name)

    # Filter to selected states if provided
    if selected_states:
        state_summary = [
            s for s in state_summary
            if s["filename"].replace(".json", "") in selected_states
        ]

    output_dir = os.path.join(state_data_path, bundle_id)
    logger.info(
        f"Processing {len(state_summary)} UI state(s) for "
        f"{base_profile} ({bundle_id})"
    )

    created = []
    skipped_home = 0

    for state_info in state_summary:
        filename = state_info["filename"]
        state_id = filename.replace(".json", "")

        # Skip internal summary entries
        if state_id.startswith("_"):
            continue

        # Skip the home state -- the base profile already represents it
        if _is_home_state(state_info, home_route):
            logger.debug(f"Skipping home state: {state_id} (route: {state_info['route']})")
            skipped_home += 1
            continue

        variant_name = f"{base_profile}-uistate_{state_id}"
        variant_path = os.path.join(output_dir, variant_name)

        if dry_run:
            logger.info(f"Would create: {variant_name} (route: {state_info['route']})")
            continue

        logger.info(f"Creating variant: {variant_name}")
        os.makedirs(variant_path, exist_ok=True)

        # Symlink mockdata
        mockdata_src = os.path.join(base_profile_path, "mockdata")
        mockdata_dst = os.path.join(variant_path, "mockdata")
        if os.path.exists(mockdata_src) and not os.path.exists(mockdata_dst):
            rel = os.path.relpath(mockdata_src, variant_path)
            os.symlink(rel, mockdata_dst)
            logger.debug(f"  Symlinked mockdata -> {rel}")

        # Symlink theme.json
        theme_src = os.path.join(base_profile_path, "theme.json")
        theme_dst = os.path.join(variant_path, "theme.json")
        if os.path.exists(theme_src) and not os.path.exists(theme_dst):
            rel = os.path.relpath(theme_src, variant_path)
            os.symlink(rel, theme_dst)
            logger.debug(f"  Symlinked theme.json -> {rel}")

        # Create sessions/default/ directory
        sessions_dir = os.path.join(variant_path, "sessions", "default")
        os.makedirs(sessions_dir, exist_ok=True)

        # Symlink *.db files from base profile's sessions/default/
        base_sessions = os.path.join(base_profile_path, "sessions", "default")
        if os.path.exists(base_sessions):
            for db_file in sorted(os.listdir(base_sessions)):
                if db_file.endswith(".db"):
                    db_src = os.path.join(base_sessions, db_file)
                    db_dst = os.path.join(sessions_dir, db_file)
                    if not os.path.exists(db_dst):
                        rel = os.path.relpath(db_src, sessions_dir)
                        os.symlink(rel, db_dst)
                        logger.debug(f"  Symlinked {db_file} -> {rel}")

        # Copy rootstore.json from ui_states
        rootstore_src = os.path.join(ui_states_path, filename)
        rootstore_dst = os.path.join(sessions_dir, "rootstore.json")
        shutil.copy2(rootstore_src, rootstore_dst)
        logger.debug(f"  Copied rootstore: {filename}")

        # Write variant marker
        write_variant_marker(
            variant_path, base_profile,
            variant_type="ui_state", variant_detail=state_id,
        )
        logger.debug(f"  Wrote variant marker: base_profile={base_profile}")

        created.append({
            "name": variant_name,
            "path": variant_path,
            "state_id": state_id,
            "route": state_info["route"],
        })

    if skipped_home:
        logger.info(f"Skipped {skipped_home} home state(s)")

    return created


def main():
    parser = argparse.ArgumentParser(
        description="Create profile variants from UI states",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # All apps, all profiles
  python scripts/create_ui_state_variants.py --all

  # All profiles for a single app
  python scripts/create_ui_state_variants.py --all email

  # Single profile
  python scripts/create_ui_state_variants.py email default

  # Only specific states
  python scripts/create_ui_state_variants.py email default --states compose_var0 sent_var0

  # Dry run
  python scripts/create_ui_state_variants.py --all --dry-run
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
        "--states",
        nargs="+",
        default=None,
        help="Only create variants for these state IDs.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be created without actually creating.",
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

    total_created = 0

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

        app_created = []
        for profile in profiles:
            try:
                created = create_ui_state_variants(
                    app_name=app_name,
                    base_profile=profile,
                    selected_states=args.states,
                    dry_run=args.dry_run,
                    logger=log,
                )
                app_created.extend(created)
            except FileNotFoundError as e:
                log.warning(str(e))
            except Exception as e:
                log.error(f"Error creating variants for {app_name}/{profile}: {e}")

        if not args.dry_run and app_created:
            print(f"\n  {app_name} ({bundle_id}): {len(app_created)} variant(s)")
            by_profile = {}
            for v in app_created:
                base = v["name"].rsplit("-uistate_", 1)[0]
                by_profile.setdefault(base, []).append(v)
            for profile, variants in sorted(by_profile.items()):
                print(f"    {profile}: {len(variants)} UI state variant(s)")

        total_created += len(app_created)

    if not args.dry_run:
        print(f"\n{'='*60}")
        print(f"Total: {total_created} UI state variant(s) created")
        print(f"{'='*60}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
