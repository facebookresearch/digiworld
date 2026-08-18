#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Generate per-app scale test assets for ADB push benchmarking.
=============================================================
Each app gets its own seed pool (images from its own scenario instances),
then those images are hard-linked (zero extra disk cost) into scale tiers.

Output structure:
    utils/scale_test_assets/
        eats/        tier_1k/ … tier_100k/
        ecommerce/   tier_1k/ … tier_100k/
        auction/     tier_1k/ … tier_100k/
        music/       tier_1k/ … tier_100k/
        video/       tier_1k/ … tier_100k/
        qwikshop/    tier_1k/ … tier_100k/

Usage:
    python3 generate_app_scale_assets.py
    python3 generate_app_scale_assets.py --apps eats ecommerce
    python3 generate_app_scale_assets.py --scales 1000 2000 5000
    python3 generate_app_scale_assets.py --cleanup
    python3 generate_app_scale_assets.py --dry-run
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path
from typing import Dict, List

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent
SCENARIOS  = REPO_ROOT / "digiworld" / "scenarios" / "scenarios"
OUT_DIR    = SCRIPT_DIR / "scale_test_assets"

# Map scenario folder name → bundle ID (for ADB remote path labeling)
APP_BUNDLE_MAP: Dict[str, str] = {
    "eats":      "com.andojoeats.sbx",
    "ecommerce": "com.andojoshop.sbx",   # ecommerce assets → shop bundle
    "auction":   "com.andojoauction.sbx",
    "music":     "com.andojomusic.sbx",
    "video":     "com.andojovideo.sbx",
    "qwikshop":  "com.andojoqwikshop.sbx",
}

DEFAULT_SCALES: List[int] = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000]
FILES_PER_BATCH = 100


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def tier_name(n: int) -> str:
    if n >= 1_000:
        return f"tier_{n // 1_000}k"
    return f"tier_{n}"


def collect_seeds(app_scenarios_dir: Path) -> List[Path]:
    seeds: List[Path] = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
        seeds.extend(app_scenarios_dir.rglob(ext))
    seeds.sort()
    return seeds


def generate_app_tier(
    app_out_dir: Path,
    n: int,
    seeds: List[Path],
    *,
    dry_run: bool,
) -> None:
    tier_dir = app_out_dir / tier_name(n)
    if dry_run:
        return

    tier_dir.mkdir(parents=True, exist_ok=True)

    for i in range(n):
        seed  = seeds[i % len(seeds)]
        batch = i // FILES_PER_BATCH
        slot  = i %  FILES_PER_BATCH
        ext   = seed.suffix

        batch_dir = tier_dir / f"batch_{batch:04d}"
        batch_dir.mkdir(exist_ok=True)

        dst = batch_dir / f"img_{slot:04d}{ext}"
        if dst.exists():
            continue

        try:
            os.link(seed, dst)
        except OSError:
            shutil.copy2(seed, dst)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    all_apps = list(APP_BUNDLE_MAP.keys())

    parser = argparse.ArgumentParser(
        description="Generate per-app scale test assets.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--apps", nargs="+", default=all_apps,
        choices=all_apps, metavar="APP",
        help=f"Apps to generate (default: all). Choices: {all_apps}",
    )
    parser.add_argument(
        "--scales", nargs="+", type=int, default=DEFAULT_SCALES, metavar="N",
        help=f"File counts per tier (default: {DEFAULT_SCALES})",
    )
    parser.add_argument(
        "--cleanup", action="store_true",
        help="Remove all generated assets and exit.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Report what would be created without writing.",
    )
    args = parser.parse_args()

    if args.cleanup:
        for app in args.apps:
            app_dir = OUT_DIR / app
            if app_dir.exists():
                print(f"  Removing {app_dir} …")
                shutil.rmtree(app_dir)
        print("Done.")
        return 0

    scales = sorted(set(args.scales))

    print("=" * 64)
    print("  Generate Per-App Scale Test Assets")
    print("=" * 64)
    print(f"  Output     : {OUT_DIR}")
    print(f"  Apps       : {args.apps}")
    print(f"  Tiers      : {scales}")
    print(f"  Dry run    : {args.dry_run}")
    print("=" * 64)

    for app in args.apps:
        app_scenarios = SCENARIOS / app
        if not app_scenarios.is_dir():
            print(f"  [SKIP] {app}: scenario dir not found at {app_scenarios}")
            continue

        seeds = collect_seeds(app_scenarios)
        if not seeds:
            print(f"  [SKIP] {app}: no image files found")
            continue

        total_mb = sum(s.stat().st_size for s in seeds) / 1_048_576
        avg_kb   = total_mb * 1024 / len(seeds)
        print(f"\n  {app:12s}  {len(seeds):4d} seeds  avg {avg_kb:.0f} KB  total {total_mb:.1f} MB")

        app_out = OUT_DIR / app
        for n in scales:
            tier_dir = app_out / tier_name(n)
            if not args.dry_run:
                generate_app_tier(app_out, n, seeds, dry_run=False)
            marker = "[DRY-RUN] " if args.dry_run else ""
            print(f"    {marker}{tier_name(n):<12}  {n:>7,} files  "
                  f"est. {n * avg_kb / 1024:.0f} MB on emulator")

    if not args.dry_run:
        print("\nVerification:")
        for app in args.apps:
            app_dir = OUT_DIR / app
            if not app_dir.exists():
                continue
            for n in scales:
                td = app_dir / tier_name(n)
                actual = sum(1 for _ in td.rglob("*") if _.is_file()) if td.exists() else 0
                status = "OK" if actual == n else f"WARN: expected {n}, got {actual}"
                print(f"  {app}/{tier_name(n):<18}  {actual:>7,} files  [{status}]")

    print(f"\nNext step:")
    print(f"  python3 benchmark_app_adb_push.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
