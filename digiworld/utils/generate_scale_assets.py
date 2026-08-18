#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Generate scale test assets for ADB push / parallel copy benchmarks.
====================================================================
Discovers all seed images from scenario instances, then hard-links them
(cycling through the pool) into self-contained tier directories:

    utils/scale_test_assets/
        tier_1k/      ←   1 000 files
        tier_2k/      ←   2 000 files
        tier_5k/      ←   5 000 files
        tier_10k/     ←  10 000 files
        tier_50k/     ←  50 000 files
        tier_100k/    ← 100 000 files

Hard-linking means zero extra disk cost on the host; the emulator receives
a genuine push per file since ADB reads each inode independently.

Files are grouped into sub-directories of 100 (img_0000 … img_0099 in
batch_000/, etc.) to avoid per-directory inode-limit issues at 50K+.

Usage:
    python3 generate_scale_assets.py                       # all default tiers
    python3 generate_scale_assets.py --scales 1000 5000    # custom subset
    python3 generate_scale_assets.py --cleanup             # remove all tiers
    python3 generate_scale_assets.py --dry-run             # report without writing
"""

from __future__ import annotations

import argparse
import os
import shutil
import sys
from pathlib import Path
from typing import List

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).parent
REPO_ROOT  = SCRIPT_DIR.parent
SCENARIOS  = REPO_ROOT / "digiworld" / "scenarios"
OUT_DIR    = SCRIPT_DIR / "scale_test_assets"

DEFAULT_SCALES: List[int] = [1_000, 2_000, 5_000, 10_000, 50_000, 100_000]
FILES_PER_BATCH = 100   # files per sub-directory (keeps dir sizes manageable)


# ---------------------------------------------------------------------------
# Seed-image discovery
# ---------------------------------------------------------------------------

def collect_seeds(scenarios_root: Path) -> List[Path]:
    seeds: List[Path] = []
    for ext in ("*.jpg", "*.jpeg", "*.png", "*.webp"):
        seeds.extend(scenarios_root.rglob(ext))
    seeds.sort()
    if not seeds:
        sys.exit(
            f"[ERROR] No seed images found under {scenarios_root}\n"
            "        Check that the scenarios directory exists and contains images."
        )
    return seeds


# ---------------------------------------------------------------------------
# Tier generation
# ---------------------------------------------------------------------------

def tier_name(n: int) -> str:
    return f"tier_{n // 1000}k" if n >= 1_000 else f"tier_{n}"


def generate_tier(out_dir: Path, n: int, seeds: List[Path], *, dry_run: bool) -> None:
    tier_dir = out_dir / tier_name(n)
    print(f"  {'[DRY-RUN] ' if dry_run else ''}→ {tier_dir.name}/  ({n:,} files)")
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
            os.link(seed, dst)       # hard-link — no extra disk usage
        except OSError:
            shutil.copy2(seed, dst)  # cross-device fallback


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

def cleanup(out_dir: Path) -> None:
    if out_dir.exists():
        print(f"  Removing {out_dir} …")
        shutil.rmtree(out_dir)
        print("  Done.")
    else:
        print(f"  Nothing to remove at {out_dir}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate scale test assets for ADB/copy benchmarks.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--scales", nargs="+", type=int, default=DEFAULT_SCALES, metavar="N",
        help=f"File counts per tier (default: {DEFAULT_SCALES})",
    )
    parser.add_argument(
        "--cleanup", action="store_true",
        help="Remove all previously generated scale assets and exit.",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Print what would be created without touching the filesystem.",
    )
    args = parser.parse_args()

    if args.cleanup:
        print(f"Cleaning up scale assets at {OUT_DIR} …")
        cleanup(OUT_DIR)
        return 0

    scales = sorted(set(args.scales))

    print("=" * 60)
    print("  Generate Scale Test Assets")
    print("=" * 60)
    print(f"  Output dir : {OUT_DIR}")
    print(f"  Tiers      : {scales}")
    print(f"  Dry run    : {args.dry_run}")
    print("=" * 60)

    print("\nCollecting seed images from scenarios …")
    seeds = collect_seeds(SCENARIOS)
    total_mb = sum(s.stat().st_size for s in seeds) / 1_048_576
    print(f"  Found {len(seeds):,} seed images  ({total_mb:.1f} MB)")

    print(f"\nGenerating {len(scales)} tier(s) …")
    for n in scales:
        generate_tier(OUT_DIR, n, seeds, dry_run=args.dry_run)

    if not args.dry_run:
        print("\nVerification:")
        for n in scales:
            td = OUT_DIR / tier_name(n)
            actual = sum(1 for _ in td.rglob("*") if _.is_file())
            status = "OK" if actual == n else f"WARN expected {n}, got {actual}"
            print(f"  {tier_name(n):<12}  {actual:>7,} files  [{status}]")

    print(f"\nRun scale benchmarks next:")
    print(f"  python3 benchmark_scale_adb_push.py")
    print(f"  python3 benchmark_scale_parallel_copy.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
