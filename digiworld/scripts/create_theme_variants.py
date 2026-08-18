#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Create Profile Variants from Themes

This script creates profile variants that share the same database, mockdata,
and rootstore (UI state) as a base profile but use a different theme.json.

Each variant is named: {base_profile}-theme_{theme_key}
And has symlinks to ALL original data, with only theme.json being different.

Theme source files are read from:
    state_data/{bundle_id}/.themes/{theme_key}.json

Usage:
    python scripts/create_theme_variants.py --all                        # all apps, all profiles
    python scripts/create_theme_variants.py --all payment                # all profiles for one app
    python scripts/create_theme_variants.py payment big_spender          # single profile
    python scripts/create_theme_variants.py payment big_spender --themes dark blue
    python scripts/create_theme_variants.py --all --dry-run
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
        if not item.is_dir() or item.name == ".themes":
            continue
        if is_variant(str(item)):
            continue
        if (item / "sessions" / "default").exists():
            profiles.append(item.name)
    return profiles


def _list_available_themes(themes_dir: str) -> dict:
    """Return ``{theme_key: path}`` for all JSON files in *themes_dir*."""
    themes = {}
    themes_path = Path(themes_dir)
    if not themes_path.is_dir():
        return themes
    for f in sorted(themes_path.iterdir()):
        if f.suffix == ".json" and not f.name.startswith("_"):
            themes[f.stem] = str(f)
    return themes


def create_theme_variants(
    app_name: str,
    base_profile: str,
    selected_themes: list = None,
    dry_run: bool = False,
    logger: logging.Logger = None,
) -> list:
    """Create theme variants for a single base profile.

    Args:
        app_name: App name (e.g. ``"payment"``).
        base_profile: Base profile name (e.g. ``"big_spender"``).
        selected_themes: Restrict to these theme keys (``None`` = all).
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

    themes_dir = os.path.join(state_data_path, bundle_id, ".themes")
    available_themes = _list_available_themes(themes_dir)
    if not available_themes:
        raise FileNotFoundError(
            f"No themes found in {themes_dir}. "
            f"Create theme JSON files there first."
        )

    if selected_themes:
        missing = set(selected_themes) - set(available_themes)
        if missing:
            raise FileNotFoundError(
                f"Theme(s) not found: {missing}. "
                f"Available: {sorted(available_themes)}"
            )
        available_themes = {k: v for k, v in available_themes.items() if k in selected_themes}

    output_dir = os.path.join(state_data_path, bundle_id)
    logger.info(
        f"Creating {len(available_themes)} theme variant(s) for "
        f"{base_profile} ({bundle_id})"
    )

    created = []
    for theme_key, theme_src_path in available_themes.items():
        variant_name = f"{base_profile}-theme_{theme_key}"
        variant_path = os.path.join(output_dir, variant_name)

        if dry_run:
            logger.info(f"Would create: {variant_name} (theme: {theme_key})")
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

        # Symlink entire sessions directory (same DB + same rootstore)
        sessions_src = os.path.join(base_profile_path, "sessions")
        sessions_dst = os.path.join(variant_path, "sessions")
        if os.path.exists(sessions_src) and not os.path.exists(sessions_dst):
            rel = os.path.relpath(sessions_src, variant_path)
            os.symlink(rel, sessions_dst)
            logger.debug(f"  Symlinked sessions -> {rel}")

        # Copy theme.json from themes directory (this is what differs)
        theme_dst = os.path.join(variant_path, "theme.json")
        if not os.path.exists(theme_dst):
            shutil.copy2(theme_src_path, theme_dst)
            logger.debug(f"  Copied theme: {theme_key}.json -> theme.json")

        write_variant_marker(
            variant_path, base_profile,
            variant_type="theme", variant_detail=theme_key,
        )
        logger.debug(f"  Wrote variant marker: base_profile={base_profile}")

        created.append({
            "name": variant_name,
            "path": variant_path,
            "theme_key": theme_key,
        })

    return created


def main():
    parser = argparse.ArgumentParser(
        description="Create profile variants with different themes",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # All apps, all profiles
  python scripts/create_theme_variants.py --all

  # All profiles for a single app
  python scripts/create_theme_variants.py --all payment

  # Single profile
  python scripts/create_theme_variants.py payment big_spender

  # Only specific themes
  python scripts/create_theme_variants.py payment big_spender --themes theme3-dark theme4-purple

  # Dry run
  python scripts/create_theme_variants.py --all --dry-run
        """,
    )

    parser.add_argument(
        "app_name",
        nargs="?",
        default=None,
        help="Name of the app (e.g. payment, transit). Omit with --all for all apps.",
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
        "--themes",
        nargs="+",
        default=None,
        help="Only create variants for these theme keys.",
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
            created = create_theme_variants(
                app_name=app_name,
                base_profile=profile,
                selected_themes=args.themes,
                dry_run=args.dry_run,
                logger=log,
            )
            app_created.extend(created)

        if not args.dry_run and app_created:
            print(f"\n  {app_name} ({bundle_id}): {len(app_created)} variant(s)")
            by_profile = {}
            for v in app_created:
                base = v["name"].rsplit("-theme_", 1)[0]
                by_profile.setdefault(base, []).append(v)
            for profile, variants in sorted(by_profile.items()):
                print(f"    {profile}: {len(variants)} theme(s)")

        total_created += len(app_created)

    if not args.dry_run:
        print(f"\n{'='*60}")
        print(f"Total: {total_created} theme variant(s) created")
        print(f"{'='*60}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
