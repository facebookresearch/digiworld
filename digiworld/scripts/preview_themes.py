#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Interactive Theme Previewer

Cycles through every theme for every app on a connected emulator.
Press Enter to advance to the next theme. The app is set up once per
bundle, then themes are hot-swapped via push_theme.

Usage:
    python scripts/preview_themes.py                     # all apps, all themes
    python scripts/preview_themes.py --app payment       # single app
    python scripts/preview_themes.py --app transit --theme midnight  # jump to specific theme
    python scripts/preview_themes.py --skip-setup        # skip set_environment (app already running)
"""

import sys
import os
import json
import argparse
import logging
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "python-agent-to-app-interaction-api",
))

import digiworld
from digiworld.app_registry import APP_REGISTRY
from digiworld.profile_variants import is_variant
from adb_actions import ADBActions


def _list_themes(themes_dir: Path) -> list:
    """Return sorted list of (theme_key, path, name, mode) tuples."""
    themes = []
    if not themes_dir.is_dir():
        return themes
    for f in sorted(themes_dir.iterdir()):
        if f.suffix != ".json" or f.name.startswith("_"):
            continue
        with open(f) as fh:
            data = json.load(fh)
        themes.append((
            f.stem,
            str(f),
            data.get("name", f.stem),
            data.get("mode", "?"),
        ))
    return themes


def _find_default_profile(app_state_dir: Path) -> str:
    """Find a usable profile for initial setup (prefer 'default')."""
    if (app_state_dir / "default" / "sessions" / "default").exists():
        return "default"
    for item in sorted(app_state_dir.iterdir()):
        if not item.is_dir() or item.name == ".themes":
            continue
        if is_variant(str(item)):
            continue
        if (item / "sessions" / "default").exists():
            return item.name
    raise FileNotFoundError(f"No valid profile in {app_state_dir}")


def _print_header(app_name, display_name, theme_idx, total, theme_name, mode):
    print(f"\n{'='*60}")
    print(f"  App:   {display_name} ({app_name})")
    print(f"  Theme: [{theme_idx+1}/{total}] {theme_name} ({mode})")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="Interactively preview themes on a connected emulator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--app", default=None,
        help="Only preview themes for this app (registry name, e.g. 'payment').",
    )
    parser.add_argument(
        "--theme", default=None,
        help="Jump directly to this theme key within the app.",
    )
    parser.add_argument(
        "--skip-setup", action="store_true",
        help="Skip set_environment (assumes app is already running).",
    )
    parser.add_argument(
        "-v", "--verbose", action="store_true",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.WARNING,
        format="%(levelname)s: %(message)s",
    )

    state_data_path = Path(digiworld.get_state_data_path().rstrip("/"))

    if args.app:
        if args.app not in APP_REGISTRY:
            print(f"Unknown app '{args.app}'. Available: {sorted(APP_REGISTRY.keys())}")
            return 1
        apps_to_preview = [args.app]
    else:
        apps_to_preview = sorted(APP_REGISTRY.keys())

    total_apps = len(apps_to_preview)

    for app_idx, app_name in enumerate(apps_to_preview):
        info = APP_REGISTRY[app_name]
        bundle_id = info["bundle_id"]
        display_name = info["display_name"]
        app_state_dir = state_data_path / bundle_id
        themes_dir = app_state_dir / ".themes"

        themes = _list_themes(themes_dir)
        if not themes:
            print(f"\n  [{app_idx+1}/{total_apps}] {display_name}: no themes, skipping")
            continue

        # Jump to a specific theme if requested
        start_idx = 0
        if args.theme:
            for i, (key, *_) in enumerate(themes):
                if key == args.theme:
                    start_idx = i
                    break

        # Set up the app once with a default profile
        if not args.skip_setup:
            print(f"\n  Setting up {display_name} ({bundle_id})...")
            profile = _find_default_profile(app_state_dir)
            adb = ADBActions(
                bundle_id=bundle_id,
                custom_path=str(state_data_path) + "/",
            )
            adb.set_environment(data_id=profile)
            adb.wait_for_ready()
            print(f"  Ready (profile: {profile})")
        else:
            adb = ADBActions(
                bundle_id=bundle_id,
                custom_path=str(state_data_path) + "/",
            )

        for t_idx in range(start_idx, len(themes)):
            theme_key, theme_path, theme_name, mode = themes[t_idx]
            _print_header(app_name, display_name, t_idx, len(themes),
                          theme_name, mode)

            adb.push_theme(theme_key, theme_file_path=theme_path)

            remaining_themes = len(themes) - t_idx - 1
            remaining_apps = total_apps - app_idx - 1

            prompt_parts = []
            if remaining_themes > 0:
                prompt_parts.append(f"{remaining_themes} more theme(s)")
            if remaining_apps > 0:
                prompt_parts.append(f"{remaining_apps} more app(s)")
            remaining_str = ", ".join(prompt_parts) if prompt_parts else "last one!"

            try:
                resp = input(f"\n  [{remaining_str}] Press Enter for next (q to quit) > ")
            except (EOFError, KeyboardInterrupt):
                print("\n  Stopped.")
                return 0
            if resp.strip().lower() == "q":
                print("\n  Stopped.")
                return 0

        # Reset args.theme so it only applies to the first app
        args.theme = None

    print(f"\n{'='*60}")
    print("  Done! All themes previewed.")
    print(f"{'='*60}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
