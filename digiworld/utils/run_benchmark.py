#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
run_benchmark.py — One-command asset push benchmark runner
==========================================================
Chains the full benchmark pipeline for any set of apps:

  1. generate_app_scale_assets.py  — build scale-tier directories (hardlinks)
  2. benchmark_app_adb_push.py     — ADB push to emulator + extrapolation
  3. benchmark_scale_parallel_copy.py — local parallel copy (no emulator needed)

Device hardware auto-probe
--------------------------
Before the ADB benchmark, the runner probes the connected emulator's /sdcard
free space (via `device_probe.py`) and automatically sets --max-tier-mb to
70% of free space so benchmarks never overflow the emulator.
You can override this with an explicit --max-tier-mb value.

Zip transfer mode (--zip)
--------------------------
Pass --zip to also benchmark the zip→push→unzip strategy alongside raw parallel
push. Each tier is zipped (ZIP_STORED) on the host, pushed as a single file,
and unzipped on the device. Per-phase timings are included in the report.

Outputs:
  utils/adb_push_benchmark_report.md
  utils/parallel_copy_benchmark_report.md
  utils/scale_test_assets/<app>/tier_Xk/   (intermediate, reused across runs)

Usage examples
--------------
  # Full run — all apps, all scales, both benchmarks
  python3 run_benchmark.py

  # Only Eats and Ecommerce
  python3 run_benchmark.py --apps eats ecommerce

  # Custom scales
  python3 run_benchmark.py --scales 1000 2000 5000 10000

  # ADB push only (skip local copy)
  python3 run_benchmark.py --adb-only

  # Local copy only (no emulator needed)
  python3 run_benchmark.py --copy-only

  # Also benchmark zip transfer strategy
  python3 run_benchmark.py --zip

  # Force regenerate assets even if they already exist
  python3 run_benchmark.py --regen

  # Clean all generated assets and exit
  python3 run_benchmark.py --cleanup

  # Fewer runs for a quick smoke-test
  python3 run_benchmark.py --runs 1 --apps eats

  # Full run with more parallel workers
  python3 run_benchmark.py --workers 5 8 12 16

  # Override the auto-probed storage limit
  python3 run_benchmark.py --max-tier-mb 1200

  # Just probe the device hardware and exit
  python3 run_benchmark.py --probe-only

Prerequisites
-------------
  • Python 3.9+
  • adb in PATH  (for ADB benchmark)
  • Android emulator running  (for ADB benchmark; run `adb devices` to verify)
  • Seed images present under digiworld/scenarios/scenarios/<app>/
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

# Importable device probe (same directory)
sys.path.insert(0, str(Path(__file__).parent))

SCRIPT_DIR = Path(__file__).parent

GENERATE_SCRIPT      = SCRIPT_DIR / "generate_app_scale_assets.py"
ADB_BENCH_SCRIPT     = SCRIPT_DIR / "benchmark_app_adb_push.py"
COPY_BENCH_SCRIPT    = SCRIPT_DIR / "benchmark_scale_parallel_copy.py"
ASSETS_DIR           = SCRIPT_DIR / "scale_test_assets"

ADB_REPORT  = SCRIPT_DIR / "adb_push_benchmark_report.md"
COPY_REPORT = SCRIPT_DIR / "parallel_copy_benchmark_report.md"

ALL_APPS    = ["eats", "ecommerce", "auction", "music", "video", "qwikshop"]
ALL_SCALES  = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000]


# ---------------------------------------------------------------------------

def run(cmd: list[str], label: str) -> int:
    print(f"\n{'━'*66}")
    print(f"  {label}")
    print(f"{'━'*66}")
    print(f"  $ {' '.join(str(c) for c in cmd)}\n")
    result = subprocess.run(cmd)
    return result.returncode


def assets_exist(apps: list[str], scales: list[int]) -> bool:
    """Return True only if every (app, tier) directory is already populated."""
    for app in apps:
        for n in scales:
            tname = f"tier_{n // 1000}k" if n >= 1000 else f"tier_{n}"
            td = ASSETS_DIR / app / tname
            if not td.exists():
                return False
            # Quick check: at least one file present
            if not any(True for _ in td.rglob("*") if _.is_file()):
                return False
    return True


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Run the full asset push benchmark pipeline.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--apps", nargs="+", default=ALL_APPS,
        choices=ALL_APPS, metavar="APP",
        help=f"Apps to benchmark. Default: all. Choices: {ALL_APPS}",
    )
    parser.add_argument(
        "--scales", nargs="+", type=int, default=ALL_SCALES, metavar="N",
        help=f"File-count tiers to generate. Default: {ALL_SCALES}",
    )
    parser.add_argument(
        "--workers", nargs="+", type=int, default=[5, 8, 12], metavar="W",
        help="Worker counts for ADB / copy benchmarks. Default: 5 8 12",
    )
    parser.add_argument(
        "--runs", type=int, default=2,
        help="Repetitions per (tier × worker) combination. Default: 2",
    )
    parser.add_argument(
        "--max-tier-mb", type=float, default=None,
        help=(
            "Skip ADB tiers whose total size exceeds this (MB). "
            "Default: auto-probed (70%% of free /sdcard). "
            "Pass 0 to disable the limit and measure everything."
        ),
    )
    parser.add_argument(
        "--adb-only",  action="store_true", help="Run ADB push benchmark only."
    )
    parser.add_argument(
        "--copy-only", action="store_true", help="Run local copy benchmark only (no emulator)."
    )
    parser.add_argument(
        "--zip", action="store_true",
        help=(
            "Zip-only mode: skip raw parallel push, measure zip→push→unzip only. "
            "Creates a single zip per tier, pushes it, unzips on device."
        ),
    )
    parser.add_argument(
        "--compare", action="store_true",
        help=(
            "Run BOTH raw parallel push AND zip side-by-side. "
            "Produces a comparison table in the report. Takes ~2× longer."
        ),
    )
    parser.add_argument(
        "--probe-only", action="store_true",
        help="Probe device hardware limits (storage, RAM, CPU) and exit.",
    )
    parser.add_argument(
        "--regen", action="store_true",
        help="Regenerate scale assets even if they already exist.",
    )
    parser.add_argument(
        "--cleanup", action="store_true",
        help="Remove all generated scale assets and exit.",
    )
    parser.add_argument(
        "--device", default=None,
        help="ADB device serial. Auto-detected if omitted.",
    )
    args = parser.parse_args()

    apps   = args.apps
    scales = sorted(set(args.scales))

    # ── Probe-only shortcut ───────────────────────────────────────────────
    if args.probe_only:
        return run(
            [sys.executable, str(SCRIPT_DIR / "device_probe.py")] +
            (["--device", args.device] if args.device else []),
            "Probing device hardware limits",
        )

    # ── Cleanup ──────────────────────────────────────────────────────────
    if args.cleanup:
        rc = run(
            [sys.executable, str(GENERATE_SCRIPT),
             "--apps"] + apps + ["--cleanup"],
            "Cleaning up generated assets",
        )
        return rc

    # ── Auto-probe device storage to set max-tier-mb ─────────────────────
    if args.max_tier_mb is not None:
        max_tier_mb   = args.max_tier_mb
        limit_source  = "user-specified"
    elif not args.copy_only:
        try:
            from device_probe import probe as _probe, safe_max_push_mb as _safe
            _device = args.device
            if _device is None:
                import subprocess as _sp
                _r = _sp.run(["adb", "devices"], capture_output=True, text=True, timeout=10)
                _lines = [l.split("\t")[0] for l in _r.stdout.splitlines() if "\tdevice" in l]
                _device = _lines[0] if _lines else None
            if _device:
                _info = _probe(_device)
                _limit = _safe(_info)
                if _limit and _limit > 0:
                    max_tier_mb  = _limit
                    limit_source = (
                        f"auto-probed from {_device} "
                        f"(70% of {_info.storage.free_mb:.0f} MB free)"
                    )
                else:
                    max_tier_mb  = 680
                    limit_source = "default (probe returned 0)"
            else:
                max_tier_mb  = 680
                limit_source = "default (no ADB device found)"
        except Exception as e:
            max_tier_mb  = 680
            limit_source = f"default (probe error: {e})"
    else:
        max_tier_mb  = 680
        limit_source = "default (copy-only mode)"

    if args.copy_only:
        mode_str = "local copy only"
    elif args.adb_only:
        adb_sub  = "zip→push→unzip" if args.zip and not args.compare else \
                   "raw + zip" if args.compare else "raw parallel push"
        mode_str = f"ADB only  [{adb_sub}]"
    else:
        adb_sub  = "zip→push→unzip" if args.zip and not args.compare else \
                   "raw + zip" if args.compare else "raw parallel push"
        mode_str = f"ADB [{adb_sub}]  +  local copy"

    print("=" * 66)
    print("  Asset Push Benchmark Pipeline")
    print("=" * 66)
    print(f"  Apps        : {apps}")
    print(f"  Scales      : {scales}")
    print(f"  Workers     : {args.workers}")
    print(f"  Runs        : {args.runs}")
    print(f"  Max tier MB : {max_tier_mb:.0f} MB  [{limit_source}]")
    print(f"  Mode        : {mode_str}")
    print("=" * 66)

    # ── Step 1: Generate assets ───────────────────────────────────────────
    if args.regen or not assets_exist(apps, scales):
        rc = run(
            [sys.executable, str(GENERATE_SCRIPT),
             "--apps"] + apps +
            ["--scales"] + [str(s) for s in scales],
            "Step 1/3 — Generate scale test assets",
        )
        if rc != 0:
            print(f"[ERROR] Asset generation failed (exit {rc})")
            return rc
    else:
        print(
            "\n  Step 1/3 — Assets already exist — skipping generation.\n"
            "            (Pass --regen to force rebuild.)"
        )

    # ── Step 2: ADB push benchmark ────────────────────────────────────────
    if not args.copy_only:
        cmd = [
            sys.executable, str(ADB_BENCH_SCRIPT),
            "--apps"] + apps + [
            "--runs",        str(args.runs),
            "--workers"]   + [str(w) for w in args.workers] + [
            "--max-tier-mb", str(max_tier_mb),
            "--output",      str(ADB_REPORT),
        ]
        if args.device:
            cmd += ["--device", args.device]
        if args.zip:
            cmd += ["--zip"]
        if args.compare:
            cmd += ["--compare"]

        rc = run(cmd, "Step 2/3 — ADB push benchmark (actual + extrapolated)")
        if rc != 0:
            print(f"[ERROR] ADB benchmark failed (exit {rc}).")
            print("        Is an emulator running?  Run: adb devices")
            if not args.adb_only:
                print("        Continuing to local copy benchmark…")
            else:
                return rc

    # ── Step 3: Local parallel copy benchmark ─────────────────────────────
    if not args.adb_only:
        rc = run(
            [sys.executable, str(COPY_BENCH_SCRIPT),
             "--runs",    str(args.runs),
             "--workers"] + [str(w) for w in args.workers] + [
             "--output",  str(COPY_REPORT),
            ],
            "Step 3/3 — Local parallel copy benchmark",
        )
        if rc != 0:
            print(f"[ERROR] Copy benchmark failed (exit {rc})")
            return rc

    # ── Summary ───────────────────────────────────────────────────────────
    print(f"\n{'━'*66}")
    print("  All done. Reports saved:")
    if not args.copy_only and ADB_REPORT.exists():
        print(f"    ADB push  → {ADB_REPORT}")
    if not args.adb_only and COPY_REPORT.exists():
        print(f"    Local copy→ {COPY_REPORT}")
    print(f"{'━'*66}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
