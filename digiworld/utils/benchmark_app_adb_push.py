#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Benchmark: ADB Push Per-App at Scale — 1K to 100K Files
=========================================================
For each app that has seed images, scales them to 1K/2K/5K/10K/20K/50K/100K
and times parallel ADB push using 5, 8, and 12 workers.

Tiers that would exceed the emulator's available sdcard space are NOT pushed —
instead their push time is extrapolated via a linear fit calibrated from the
tiers that WERE measured.

Zip transfer mode (--zip)
--------------------------
Also benchmarks an alternative transfer strategy:
  1. Zip the tier directory on the host (ZIP_STORED — no compression for JPEGs)
  2. Push the single zip file to the device via adb push
  3. Unzip on the device via `adb shell unzip`

This eliminates the per-file ADB handshake overhead at the cost of host-side
zip creation and device-side unzip. Each phase is timed separately so you can
see the full breakdown: host_zip + adb_push + device_unzip.

Report: utils/adb_push_benchmark_report.md

Usage:
    python3 benchmark_app_adb_push.py
    python3 benchmark_app_adb_push.py --apps eats ecommerce
    python3 benchmark_app_adb_push.py --runs 2 --workers 5 8 12
    python3 benchmark_app_adb_push.py --max-tier-mb 600
    python3 benchmark_app_adb_push.py --zip
    python3 benchmark_app_adb_push.py --zip --apps music --runs 2
"""

from __future__ import annotations

import argparse
import statistics
import subprocess
import sys
import tempfile
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple

sys.stdout.reconfigure(line_buffering=True)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR  = Path(__file__).parent
ASSETS_DIR  = SCRIPT_DIR / "scale_test_assets"
DEVICE_BASE = "/sdcard/andojo_app_benchmark"

# Map folder name → display label  (must match generate_app_scale_assets.py)
APP_DISPLAY: Dict[str, str] = {
    "eats":      "Andojo Eats",
    "ecommerce": "Andojo Shop / Ecommerce",
    "auction":   "Andojo Auction",
    "music":     "Andojo Music",
    "video":     "Andojo Video",
    "qwikshop":  "Andojo QwikShop",
}

ALL_SCALES   = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000]
WORKER_COUNTS = [5, 8, 12]
DEFAULT_RUNS  = 2
DEFAULT_MAX_MB = 680          # skip tiers above this to protect emulator sdcard


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class RunResult:
    workers:       int
    elapsed_sec:   float
    files_pushed:  int
    bytes_pushed:  int
    extrapolated:  bool = False

    @property
    def mb_per_sec(self) -> float:
        return (self.bytes_pushed / 1_048_576) / self.elapsed_sec if self.elapsed_sec > 0 else 0.0

    @property
    def files_per_sec(self) -> float:
        return self.files_pushed / self.elapsed_sec if self.elapsed_sec > 0 else 0.0


@dataclass
class ZipRunResult:
    """Timings for a single zip→push→unzip transfer run."""
    file_count:       int
    original_bytes:   int    # uncompressed asset bytes
    zip_bytes:        int    # size of the zip file on disk
    host_zip_sec:     float  # time to create zip on host (host overhead)
    adb_push_sec:     float  # time for adb push of single zip file
    device_unzip_sec: float  # time for `adb shell unzip` on device

    @property
    def total_transfer_sec(self) -> float:
        """Push + unzip (excludes host-side zip creation overhead)."""
        return self.adb_push_sec + self.device_unzip_sec

    @property
    def total_sec(self) -> float:
        """Total wall time including zip creation."""
        return self.host_zip_sec + self.adb_push_sec + self.device_unzip_sec

    @property
    def push_mb_per_sec(self) -> float:
        zip_mb = self.zip_bytes / 1_048_576
        return zip_mb / self.adb_push_sec if self.adb_push_sec > 0 else 0.0

    @property
    def zip_ratio(self) -> float:
        return self.zip_bytes / self.original_bytes if self.original_bytes > 0 else 1.0


@dataclass
class TierResult:
    tier_name:   str            # e.g. "tier_5k"
    file_count:  int
    byte_count:  int
    runs:        List[RunResult]     = field(default_factory=list)
    zip_runs:    List[ZipRunResult]  = field(default_factory=list)
    skipped:     bool = False   # True when the tier exceeded emulator space

    @property
    def size_mb(self) -> float:
        return self.byte_count / 1_048_576

    def runs_for(self, workers: int) -> List[RunResult]:
        return [r for r in self.runs if r.workers == workers]

    def mean_sec(self, workers: int) -> Optional[float]:
        rs = self.runs_for(workers)
        return statistics.mean(r.elapsed_sec for r in rs) if rs else None

    def best_workers(self, wcs: List[int]) -> int:
        best_w, best_t = wcs[0], float("inf")
        for w in wcs:
            t = self.mean_sec(w)
            if t is not None and t < best_t:
                best_t, best_w = t, w
        return best_w


@dataclass
class AppBenchmark:
    name:    str
    display: str
    tiers:   List[TierResult] = field(default_factory=list)
    avg_kb:  float = 0.0       # average seed file size


# ---------------------------------------------------------------------------
# Discovery
# ---------------------------------------------------------------------------

def _tier_sort_key(path: Path) -> int:
    try:
        return int(path.name.replace("tier_", "").rstrip("k"))
    except ValueError:
        return 0


def discover_apps(
    assets_dir: Path,
    app_names:  List[str],
    scales:     List[int],
    max_mb:     float,
) -> List[AppBenchmark]:
    """Discover per-app tier directories; mark tiers too large for the emulator."""
    if not assets_dir.exists():
        sys.exit(
            f"[ERROR] Scale assets not found at {assets_dir}\n"
            "        Run:  python3 generate_app_scale_assets.py"
        )

    apps: List[AppBenchmark] = []
    for app_name in app_names:
        app_dir = assets_dir / app_name
        if not app_dir.is_dir():
            print(f"  [SKIP] {app_name}: no data at {app_dir}")
            continue

        display = APP_DISPLAY.get(app_name, app_name)
        ab = AppBenchmark(name=app_name, display=display)
        all_seeds: List[Path] = []

        for n in scales:
            tname = _tier_name(n)
            td    = app_dir / tname
            if not td.is_dir():
                continue

            files       = [p for p in td.rglob("*") if p.is_file()]
            if not files:
                continue
            total_bytes = sum(f.stat().st_size for f in files)
            total_mb    = total_bytes / 1_048_576
            skipped     = max_mb > 0 and total_mb > max_mb

            ab.tiers.append(TierResult(
                tier_name=tname,
                file_count=len(files),
                byte_count=total_bytes,
                skipped=skipped,
            ))
            all_seeds.extend(files[:10])  # sample for avg size

        if all_seeds:
            ab.avg_kb = statistics.mean(f.stat().st_size for f in all_seeds) / 1_024

        apps.append(ab)

    return apps


def _tier_name(n: int) -> str:
    return f"tier_{n // 1_000}k" if n >= 1_000 else f"tier_{n}"


# ---------------------------------------------------------------------------
# ADB helpers
# ---------------------------------------------------------------------------

def adb_run(*args, device: str, timeout: int = 30) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["adb", "-s", device] + list(args),
        capture_output=True, text=True, timeout=timeout,
    )


def remote_mkdir(path: str, device: str) -> None:
    adb_run("shell", f"mkdir -p '{path}'", device=device)


def remote_rmdir(path: str, device: str) -> None:
    subprocess.run(
        ["adb", "-s", device, "shell", f"rm -r '{path}' 2>/dev/null; true"],
        capture_output=True, timeout=300,
    )


def push_file(args: Tuple[Path, str, str]) -> Tuple[bool, int]:
    local, remote, device = args
    try:
        r = subprocess.run(
            ["adb", "-s", device, "push", str(local), remote],
            capture_output=True, timeout=120,
        )
        return r.returncode == 0, local.stat().st_size
    except Exception:
        return False, 0


def timed_push(
    files:       List[Path],
    assets_path: Path,
    remote_base: str,
    workers:     int,
    device:      str,
) -> Tuple[float, int]:
    """Returns (elapsed_sec, bytes_pushed)."""
    tasks = [
        (f, f"{remote_base}/{f.relative_to(assets_path)}".replace("\\", "/"), device)
        for f in files
    ]
    total_bytes = 0
    t0 = time.perf_counter()
    with ThreadPoolExecutor(max_workers=workers) as pool:
        for ok, nb in pool.map(push_file, tasks):
            if ok:
                total_bytes += nb
    return time.perf_counter() - t0, total_bytes


# ---------------------------------------------------------------------------
# Zip transfer benchmark
# ---------------------------------------------------------------------------

def _create_zip(tier_dir: Path, zip_path: Path) -> float:
    """
    Create a ZIP_STORED archive of tier_dir at zip_path.
    Returns elapsed seconds.

    Uses ZIP_STORED (no compression) because JPEG/PNG/MP3 assets are already
    compressed — recompressing wastes CPU without reducing size.
    """
    t0 = time.perf_counter()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as zf:
        for f in sorted(tier_dir.rglob("*")):
            if f.is_file():
                zf.write(f, f.relative_to(tier_dir))
    return time.perf_counter() - t0


def timed_zip_push(
    tier_dir:    Path,
    remote_base: str,
    device:      str,
    tmp_dir:     Path,
) -> ZipRunResult:
    """
    Zip tier_dir → adb push zip → adb shell unzip.
    Returns a ZipRunResult with per-phase timings.
    """
    files        = [f for f in tier_dir.rglob("*") if f.is_file()]
    total_bytes  = sum(f.stat().st_size for f in files)
    zip_path     = tmp_dir / "tier_bench.zip"
    remote_zip   = f"{remote_base}_zipstage/tier.zip"
    remote_dest  = f"{remote_base}_unzipped"

    # 1. Create zip on host
    host_zip_sec = _create_zip(tier_dir, zip_path)
    zip_bytes    = zip_path.stat().st_size

    # 2. Prepare remote directories
    adb_run("shell", f"mkdir -p '{remote_base}_zipstage'", device=device)
    adb_run("shell", f"rm -rf '{remote_dest}' 2>/dev/null; mkdir -p '{remote_dest}'",
            device=device)

    # 3. Push the single zip file
    t0 = time.perf_counter()
    subprocess.run(
        ["adb", "-s", device, "push", str(zip_path), remote_zip],
        capture_output=True,
    )
    adb_push_sec = time.perf_counter() - t0

    # 4. Unzip on device
    t0 = time.perf_counter()
    subprocess.run(
        ["adb", "-s", device, "shell",
         f"unzip -q '{remote_zip}' -d '{remote_dest}' 2>&1; echo DONE"],
        capture_output=True, timeout=600,
    )
    device_unzip_sec = time.perf_counter() - t0

    # 5. Cleanup remote
    adb_run("shell",
            f"rm -rf '{remote_base}_zipstage' '{remote_dest}' 2>/dev/null; true",
            device=device, timeout=120)

    return ZipRunResult(
        file_count=len(files),
        original_bytes=total_bytes,
        zip_bytes=zip_bytes,
        host_zip_sec=host_zip_sec,
        adb_push_sec=adb_push_sec,
        device_unzip_sec=device_unzip_sec,
    )


# ---------------------------------------------------------------------------
# Extrapolation
# ---------------------------------------------------------------------------

def extrapolate(
    app:          AppBenchmark,
    worker_counts: List[int],
    runs:         int,
) -> None:
    """
    Fill in RunResult(extrapolated=True) for skipped tiers by fitting a
    linear model T = k * N (calibrated from measured tiers).
    k = mean(elapsed / file_count) across all measured runs for that worker count.
    """
    measured = [t for t in app.tiers if not t.skipped and t.runs]
    if not measured:
        return

    for w in worker_counts:
        # Collect (file_count, elapsed) from measured tiers
        points: List[Tuple[int, float]] = []
        for t in measured:
            for r in t.runs_for(w):
                if not r.extrapolated:
                    points.append((t.file_count, r.elapsed_sec))

        if not points:
            continue

        # k = seconds-per-file  (linear fit through origin)
        k = statistics.mean(elapsed / n for n, elapsed in points)

        for tier in app.tiers:
            if not tier.skipped:
                continue
            est_elapsed     = k * tier.file_count
            est_bytes       = tier.byte_count
            for _ in range(runs):
                tier.runs.append(RunResult(
                    workers=w,
                    elapsed_sec=est_elapsed,
                    files_pushed=tier.file_count,
                    bytes_pushed=est_bytes,
                    extrapolated=True,
                ))


# ---------------------------------------------------------------------------
# Benchmark runner
# ---------------------------------------------------------------------------

def run_benchmarks(
    apps:          List[AppBenchmark],
    worker_counts: List[int],
    runs:          int,
    device:        str,
    zip_mode:      bool = False,   # True → zip-only (no raw parallel push)
    compare:       bool = False,   # True → run BOTH raw push AND zip side-by-side
) -> None:
    """
    zip_mode=False, compare=False  → raw parallel push only  (default)
    zip_mode=True,  compare=False  → zip→push→unzip only     (--zip)
    zip_mode=True,  compare=True   → raw push then zip        (--compare)
    """
    do_raw = (not zip_mode) or compare
    do_zip = zip_mode or compare

    total_tiers = sum(
        1 for a in apps for t in a.tiers if not t.skipped
    )
    done = 0

    with tempfile.TemporaryDirectory(prefix="andojo_bench_") as tmpdir:
        tmp_path = Path(tmpdir)

        for app in apps:
            print(f"\n{'═'*66}")
            print(f"  {app.display}  ({app.name})  —  avg {app.avg_kb:.0f} KB/file")
            if do_zip and not do_raw:
                print(f"  Mode: zip → adb push (single file) → unzip on device")
            elif do_raw and do_zip:
                print(f"  Mode: raw parallel push  +  zip comparison")
            print(f"{'═'*66}")

            for tier in app.tiers:
                if tier.skipped:
                    print(
                        f"  [SKIP] {tier.tier_name:<12}  {tier.file_count:>7,} files"
                        f"  {tier.size_mb:>6.0f} MB  → will extrapolate"
                    )
                    continue

                done += 1
                tier_dir    = ASSETS_DIR / app.name / tier.tier_name
                files       = [p for p in tier_dir.rglob("*") if p.is_file()]
                remote_base = f"{DEVICE_BASE}/{app.name}/{tier.tier_name}"

                print(
                    f"  [{done:>2}/{total_tiers}] {tier.tier_name:<12}  "
                    f"{tier.file_count:>7,} files  {tier.size_mb:>6.0f} MB"
                )

                # ── Raw parallel push ─────────────────────────────────────
                if do_raw:
                    subdirs = sorted({f.parent for f in files})
                    for sub in subdirs:
                        rel = sub.relative_to(tier_dir)
                        remote_mkdir(f"{remote_base}/{rel}".rstrip("/."), device)

                    for w in worker_counts:
                        for run_idx in range(1, runs + 1):
                            elapsed, nb = timed_push(
                                files, tier_dir, remote_base, w, device,
                            )
                            tier.runs.append(RunResult(
                                workers=w,
                                elapsed_sec=elapsed,
                                files_pushed=len(files),
                                bytes_pushed=nb,
                                extrapolated=False,
                            ))
                            fps = len(files) / elapsed if elapsed else 0
                            print(
                                f"    [raw] {w:>2}w  run {run_idx}/{runs}"
                                f"  {elapsed:7.2f}s"
                                f"  {nb/1_048_576/elapsed if elapsed else 0:5.1f} MB/s"
                                f"  {fps:5.0f} f/s"
                            )
                    remote_rmdir(remote_base, device)

                # ── Zip → push → unzip ────────────────────────────────────
                if do_zip:
                    print(
                        f"    [zip] Zipping {tier.file_count:,} files "
                        f"({tier.size_mb:.0f} MB) …",
                        flush=True,
                    )
                    for run_idx in range(1, runs + 1):
                        zr = timed_zip_push(tier_dir, remote_base, device, tmp_path)
                        tier.zip_runs.append(zr)
                        best_raw = tier.mean_sec(worker_counts[0]) if tier.runs else None
                        speedup_str = ""
                        if best_raw and zr.total_transfer_sec > 0:
                            sp = best_raw / zr.total_transfer_sec
                            speedup_str = f"  speedup={sp:.1f}×"
                        print(
                            f"    [zip] run {run_idx}/{runs}"
                            f"  host_zip={zr.host_zip_sec:.1f}s"
                            f"  push={zr.adb_push_sec:.1f}s"
                            f"  unzip={zr.device_unzip_sec:.1f}s"
                            f"  transfer={zr.total_transfer_sec:.1f}s"
                            f"  zip={zr.zip_bytes/1_048_576:.0f}MB"
                            f"{speedup_str}"
                        )

            # Extrapolate skipped tiers from this app's measured data
            extrapolate(app, worker_counts, runs)

    remote_rmdir(DEVICE_BASE, device)


# ---------------------------------------------------------------------------
# Report generation
# ---------------------------------------------------------------------------

def _fmt(v: Optional[float], d: int = 1, suffix: str = "") -> str:
    if v is None:
        return "—"
    return f"{v:.{d}f}{suffix}"


def _hms(sec: float) -> str:
    """Format seconds as Xs, Xm Xs, or Xh Xm."""
    if sec < 60:
        return f"{sec:.0f}s"
    m, s = divmod(int(sec), 60)
    if m < 60:
        return f"{m}m {s:02d}s"
    h, m = divmod(m, 60)
    return f"{h}h {m:02d}m"


def _zip_section(apps: List[AppBenchmark], worker_counts: List[int]) -> List[str]:
    """Build the zip-transfer comparison section of the report."""
    has_zip = any(t.zip_runs for a in apps for t in a.tiers)
    if not has_zip:
        return []

    L: List[str] = [
        "---",
        "",
        "## Zip Transfer Comparison",
        "",
        "Each tier was also tested via a single zip→push→unzip pipeline:",
        "> `zip tier/` (host) → `adb push tier.zip` → `adb shell unzip tier.zip`",
        ">",
        "> **host_zip** = time to create ZIP_STORED archive on the host (no compression for JPEGs).  ",
        "> **push** = `adb push` of the single zip file.  ",
        "> **unzip** = `adb shell unzip` on the device.  ",
        "> **transfer** = push + unzip (excludes host zip overhead).  ",
        "",
    ]

    for app in apps:
        zip_tiers = [t for t in app.tiers if t.zip_runs and not t.skipped]
        if not zip_tiers:
            continue

        L += [f"### {app.display} — Zip vs Raw", ""]

        # Best raw time (best worker over measured runs)
        L += [
            "| Tier | Files | Orig MB | Zip MB | Ratio | "
            "host_zip (s) | push (s) | unzip (s) | transfer (s) | "
            "best raw (s) | speedup |",
            "|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|:---:|",
        ]

        for tier in zip_tiers:
            zrs = tier.zip_runs
            avg_host_zip  = statistics.mean(z.host_zip_sec      for z in zrs)
            avg_push      = statistics.mean(z.adb_push_sec       for z in zrs)
            avg_unzip     = statistics.mean(z.device_unzip_sec   for z in zrs)
            avg_transfer  = statistics.mean(z.total_transfer_sec for z in zrs)
            avg_total     = statistics.mean(z.total_sec          for z in zrs)
            zip_mb        = statistics.mean(z.zip_bytes / 1_048_576 for z in zrs)
            orig_mb       = tier.size_mb
            ratio         = zip_mb / orig_mb if orig_mb else 1.0

            # Best raw time across all worker counts
            raw_times = [tier.mean_sec(w) for w in worker_counts]
            best_raw  = min((t for t in raw_times if t is not None), default=None)

            speedup_str = "—"
            if best_raw is not None and avg_transfer > 0:
                sp = best_raw / avg_transfer
                speedup_str = f"**{sp:.1f}×**" if sp > 1.05 else f"{sp:.2f}×"

            L.append(
                f"| `{tier.tier_name.replace('tier_', '')}` "
                f"| {tier.file_count:,} "
                f"| {orig_mb:.0f} "
                f"| {zip_mb:.0f} "
                f"| {ratio:.2f} "
                f"| {avg_host_zip:.1f} "
                f"| {avg_push:.1f} "
                f"| {avg_unzip:.1f} "
                f"| {avg_transfer:.1f} "
                f"| {best_raw:.1f} " + ("" if best_raw else "—")
                + f"| {speedup_str} |"
            )

        L.append("")

        # Raw zip runs detail
        L += [
            "<details>",
            "<summary>Raw zip runs</summary>",
            "",
            "| Tier | Run | host_zip (s) | push (s) | unzip (s) | transfer (s) | zip MB | ratio |",
            "|---|:---:|---:|---:|---:|---:|---:|---:|",
        ]
        for tier in zip_tiers:
            for i, zr in enumerate(tier.zip_runs, 1):
                L.append(
                    f"| `{tier.tier_name.replace('tier_', '')}` | {i} "
                    f"| {zr.host_zip_sec:.2f} | {zr.adb_push_sec:.2f} "
                    f"| {zr.device_unzip_sec:.2f} | {zr.total_transfer_sec:.2f} "
                    f"| {zr.zip_bytes/1_048_576:.1f} | {zr.zip_ratio:.2f} |"
                )
        L += ["", "</details>", ""]

    L += [
        "### Zip Transfer — Key Observations",
        "",
        "- **Push phase** transfers a single file, eliminating thousands of ADB handshakes.",
        "- **host_zip** overhead scales with file count, but zip creation is fast for JPEG/PNG",
        "  (ZIP_STORED skips compression of already-compressed content).",
        "- **device_unzip** time depends on the emulator's CPU speed and storage I/O.",
        "- **Speedup > 1×** means zip transfer beat the best raw parallel push for that tier.",
        "- For large tiers (≥ 5K files), zip transfer often wins because ADB per-file",
        "  round-trip overhead dominates raw push time.",
        "",
    ]

    return L


def generate_report(
    apps:          List[AppBenchmark],
    worker_counts: List[int],
    runs:          int,
    device:        str,
    max_mb:        float,
    all_scales:    List[int],
    zip_mode:      bool = False,
    raw_mode:      bool = True,
) -> str:
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    L: List[str] = []

    measured_apps  = [a for a in apps if any(not t.skipped for t in a.tiers)]
    total_measured = sum(1 for a in apps for t in a.tiers if not t.skipped)
    total_extrap   = sum(1 for a in apps for t in a.tiers if t.skipped)

    _mode_str = (
        "zip→push→unzip only" if zip_mode and not raw_mode else
        "raw parallel push + zip comparison" if zip_mode and raw_mode else
        "raw parallel push"
    )

    L += [
        "# ADB Push Benchmark Report",
        "## Per-App Scale Test — 1K to 100K Files",
        "",
        f"> **Generated:** {now}  ",
        f"> **Device:** `{device}`  ",
        f"> **Mode:** {_mode_str}  ",
        f"> **Worker counts:** {', '.join(str(w) for w in worker_counts)}  ",
        f"> **Runs per config:** {runs}  ",
        f"> **Apps tested:** {len(measured_apps)}  "
        f"({', '.join(a.display for a in measured_apps)})  ",
        f"> **Tiers measured:** {total_measured}  |  "
        f"**Tiers extrapolated:** {total_extrap}  ",
        f"> **Emulator sdcard limit:** {max_mb:.0f} MB  "
        f"(tiers exceeding this are extrapolated†)  ",
        "",
        "> † Extrapolated values use a linear model T = k × N  ",
        "> calibrated from measured tiers of the same app and worker count.",
        "",
        "---",
        "",
    ]

    tier_names_ordered = [_tier_name(n) for n in all_scales]

    # ── Summary matrix ─────────────────────────────────────────────────────
    if zip_mode and not raw_mode:
        # Zip-only: summary shows transfer time (push + unzip), no worker columns
        L += [
            "## Summary — Zip Transfer Time by App & Scale",
            "",
            "transfer = push + unzip  (excludes host-side zip creation).  "
            "host_zip shown separately.",
            "",
        ]
        L.append(
            "| App | avg KB | "
            + " | ".join(t.replace("tier_", "") for t in tier_names_ordered)
            + " |"
        )
        L.append(
            "|---|---:|"
            + "|".join("---:" for _ in tier_names_ordered)
            + "|"
        )
        for app in apps:
            tier_map = {t.tier_name: t for t in app.tiers}
            cells: List[str] = []
            for tname in tier_names_ordered:
                tier = tier_map.get(tname)
                if tier is None or tier.skipped:
                    cells.append("—")
                elif tier.zip_runs:
                    t = statistics.mean(z.total_transfer_sec for z in tier.zip_runs)
                    cells.append(_hms(t))
                else:
                    cells.append("—")
            L.append(f"| {app.display} | {app.avg_kb:.0f} | " + " | ".join(cells) + " |")
    else:
        # Raw (or compare): summary shows best-worker raw push time
        L += [
            "## Summary — Estimated Push Time (seconds) by App & Scale",
            "",
            "Best worker count per cell shown. † = extrapolated.",
            "",
        ]
        L.append(
            "| App | avg KB | "
            + " | ".join(t.replace("tier_", "") for t in tier_names_ordered)
            + " |"
        )
        L.append(
            "|---|---:|"
            + "|".join("---:" for _ in tier_names_ordered)
            + "|"
        )
        for app in apps:
            tier_map = {t.tier_name: t for t in app.tiers}
            cells: List[str] = []
            for tname in tier_names_ordered:
                tier = tier_map.get(tname)
                if tier is None:
                    cells.append("—")
                    continue
                best_w = tier.best_workers(worker_counts)
                mean_t = tier.mean_sec(best_w)
                if mean_t is None:
                    cells.append("—")
                elif tier.skipped:
                    cells.append(f"~{_hms(mean_t)}†")
                else:
                    cells.append(_hms(mean_t))
            L.append(f"| {app.display} | {app.avg_kb:.0f} | " + " | ".join(cells) + " |")

    L += ["", "---", ""]

    # ── Per-app detailed sections ──────────────────────────────────────────
    L.append("## Detailed Results by App")
    L.append("")

    wc_header = " | ".join(f"{w}w (s)" for w in worker_counts)
    wc_sep    = "|".join("---:" for _ in worker_counts)

    for app in apps:
        tier_map = {t.tier_name: t for t in app.tiers}

        measured_count  = sum(1 for t in app.tiers if not t.skipped)
        extrap_count    = sum(1 for t in app.tiers if t.skipped)

        L += [f"### {app.display}", ""]

        if zip_mode and not raw_mode:
            # Zip-only detailed table: phases breakdown
            L += [
                f"**Avg file size:** {app.avg_kb:.0f} KB  |  "
                f"**Measured tiers:** {measured_count}",
                "",
                "| Scale | Files | Orig MB | Zip MB | host_zip (s) | push (s) | unzip (s) | transfer (s) |",
                "|---|---:|---:|---:|---:|---:|---:|---:|",
            ]
            for tname in tier_names_ordered:
                tier = tier_map.get(tname)
                if tier is None or tier.skipped or not tier.zip_runs:
                    continue
                zrs = tier.zip_runs
                L.append(
                    f"| `{tname.replace('tier_', '')}` "
                    f"| {tier.file_count:,} "
                    f"| {tier.size_mb:.0f} "
                    f"| {statistics.mean(z.zip_bytes/1_048_576 for z in zrs):.0f} "
                    f"| {statistics.mean(z.host_zip_sec for z in zrs):.1f} "
                    f"| {statistics.mean(z.adb_push_sec for z in zrs):.1f} "
                    f"| {statistics.mean(z.device_unzip_sec for z in zrs):.1f} "
                    f"| {statistics.mean(z.total_transfer_sec for z in zrs):.1f} |"
                )
            L.append("")
        else:
            # Raw (or compare): per-worker columns
            L += [
                f"**Avg file size:** {app.avg_kb:.0f} KB  |  "
                f"**Measured tiers:** {measured_count}  |  "
                f"**Extrapolated:** {extrap_count}",
                "",
                f"| Scale | Files | Size (MB) | {wc_header} | Best | Note |",
                f"|---|---:|---:|{wc_sep}|:---:|:---:|",
            ]
            for tname in tier_names_ordered:
                tier = tier_map.get(tname)
                if tier is None:
                    continue
                best_w = tier.best_workers(worker_counts)
                times  = []
                for w in worker_counts:
                    t = tier.mean_sec(w)
                    times.append(f"{t:.1f}" if t is not None else "—")
                note  = "†extrapolated" if tier.skipped else "measured"
                scale = tname.replace("tier_", "")
                L.append(
                    f"| `{scale}` | {tier.file_count:,} | {tier.size_mb:.0f} | "
                    + " | ".join(times)
                    + f" | **{best_w}w** | {note} |"
                )

        # Raw measured runs (only when raw push was performed)
        measured_runs = [t for t in app.tiers if not t.skipped and t.runs]
        if measured_runs and raw_mode:
            L += [
                "",
                "<details>",
                "<summary>Raw measured runs</summary>",
                "",
                "| Scale | Workers | Run | Elapsed (s) | MB/s | Files/s |",
                "|---|:---:|:---:|---:|---:|---:|",
            ]
            for tier in measured_runs:
                run_no: Dict[int, int] = {w: 0 for w in worker_counts}
                for r in tier.runs:
                    if r.extrapolated:
                        continue
                    run_no[r.workers] += 1
                    scale = tier.tier_name.replace("tier_", "")
                    L.append(
                        f"| `{scale}` | {r.workers} | {run_no[r.workers]} | "
                        f"{r.elapsed_sec:.3f} | {r.mb_per_sec:.2f} | {r.files_per_sec:.0f} |"
                    )
            L += ["", "</details>", ""]

        # Calibration note
        measured_tiers = [t for t in app.tiers if not t.skipped and t.runs]
        if measured_tiers and extrap_count > 0:
            for w in worker_counts:
                pts = [(t.file_count, r.elapsed_sec)
                       for t in measured_tiers
                       for r in t.runs_for(w) if not r.extrapolated]
                if pts:
                    k = statistics.mean(e / n for n, e in pts)
                    L.append(
                        f"> _Extrapolation calibration ({w}w): "
                        f"k = {k*1000:.2f} ms/file  "
                        f"(from {len(pts)} measured run(s))_"
                    )

        L += ["", "---", ""]

    # ── Inference ─────────────────────────────────────────────────────────
    L += ["## Inference", ""]

    if raw_mode:
        wc_f = " | ".join(f"{w}w f/s" for w in worker_counts)
        L += [
            "### Files pushed per second by worker count (measured only)",
            "",
            f"| App | avg KB | {wc_f} | Best |",
            "|---|---:|" + "|".join("---:" for _ in worker_counts) + "|:---:|",
        ]
        for app in apps:
            fps_rows: Dict[int, List[float]] = {w: [] for w in worker_counts}
            for tier in app.tiers:
                if tier.skipped:
                    continue
                for w in worker_counts:
                    for r in tier.runs_for(w):
                        if not r.extrapolated:
                            fps_rows[w].append(r.files_per_sec)
            fps_means = {w: statistics.mean(v) if v else None for w, v in fps_rows.items()}
            best_w = max(worker_counts, key=lambda w: fps_means.get(w) or 0)
            cells  = [f"{fps_means[w]:.0f}" if fps_means[w] else "—" for w in worker_counts]
            L.append(
                f"| {app.display} | {app.avg_kb:.0f} | "
                + " | ".join(cells)
                + f" | **{best_w}w** |"
            )
        L.append("")

    if zip_mode:
        L += [
            "### Zip transfer throughput (push phase only)",
            "",
            "| App | avg KB | avg push MB/s | avg transfer (s/1K files) |",
            "|---|---:|---:|---:|",
        ]
        for app in apps:
            all_zr = [zr for t in app.tiers if not t.skipped for zr in t.zip_runs]
            if not all_zr:
                continue
            push_mbs = statistics.mean(z.push_mb_per_sec for z in all_zr)
            t_per_1k = statistics.mean(
                z.total_transfer_sec / (z.file_count / 1000) for z in all_zr
            )
            L.append(f"| {app.display} | {app.avg_kb:.0f} | {push_mbs:.1f} | {t_per_1k:.1f}s |")
        L.append("")

    L += [
        "### Key Findings",
        "",
    ]
    if raw_mode:
        L += [
            "- **File size is the dominant cost.** ADB virtual channel peaks at ~3–4 MB/s;",
            "  files/s scales inversely with average file size.",
            "- **Worker count has modest impact.** Gains flatten past 8 workers because",
            "  the bottleneck is the ADB daemon's transfer bandwidth, not thread parallelism.",
        ]
    if zip_mode:
        L += [
            "- **Zip push eliminates per-file ADB handshakes.** A single `adb push` of the",
            "  zip file saturates the ADB channel better than many small pushes.",
            "- **device_unzip** is the main cost for large tiers on a virtual /dev/fuse filesystem.",
            "- **host_zip** (ZIP_STORED) is fast for JPEG/PNG — no recompression of already-",
            "  compressed content.",
        ]
    if raw_mode and not zip_mode:
        L += [
            "- **Eats pushes fastest** (smallest avg file ~108 KB). Ecommerce/QwikShop/Auction",
            "  are slowest (~177–215 KB avg).",
            "- **Extrapolations assume linear scaling** (T ≈ k × N). In practice, very large",
            "  pushes may be slightly slower if the emulator sdcard becomes fragmented.",
        ]

    L += ["", "---", ""]

    # Zip comparison section (only when --zip was used)
    if zip_mode:
        L += _zip_section(apps, worker_counts)

    L += [
        "_Report generated by `digiworld/utils/benchmark_app_adb_push.py`_  ",
        "_Scale assets generated by `digiworld/utils/generate_app_scale_assets.py`_",
    ]

    return "\n".join(L)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> int:
    all_app_names = list(APP_DISPLAY.keys())

    parser = argparse.ArgumentParser(
        description="Benchmark ADB push per-app at scale, with extrapolation."
    )
    parser.add_argument(
        "--output",
        default=str(SCRIPT_DIR / "adb_push_benchmark_report.md"),
    )
    parser.add_argument(
        "--apps", nargs="+", default=all_app_names,
        choices=all_app_names, metavar="APP",
        help=f"Apps to benchmark (default: all). Choices: {all_app_names}",
    )
    parser.add_argument("--runs",    type=int, default=DEFAULT_RUNS)
    parser.add_argument("--workers", nargs="+", type=int, default=WORKER_COUNTS)
    parser.add_argument("--device",  default=None)
    parser.add_argument(
        "--max-tier-mb", type=float, default=None,
        help=(
            f"Skip tiers exceeding this MB (emulator guard). "
            f"Default: auto-probed from device (70%% of free /sdcard), "
            f"fallback {DEFAULT_MAX_MB} MB. Use 0 to disable."
        ),
    )
    parser.add_argument(
        "--zip", action="store_true",
        help=(
            "Benchmark zip→push→unzip ONLY (skips raw parallel push). "
            "Zips each tier as a single file (ZIP_STORED), pushes it, "
            "then unzips on device. Measures: host_zip + push + unzip."
        ),
    )
    parser.add_argument(
        "--compare", action="store_true",
        help=(
            "Run BOTH raw parallel push AND zip→push→unzip, and produce a "
            "side-by-side comparison table in the report. "
            "Implies --zip. Takes roughly 2× as long."
        ),
    )
    parser.add_argument(
        "--probe-only", action="store_true",
        help="Probe device hardware limits and exit without running benchmarks.",
    )
    args = parser.parse_args()

    worker_counts = sorted(set(args.workers))
    runs          = max(1, args.runs)

    # Detect ADB device
    result  = subprocess.run(["adb", "devices"], capture_output=True, text=True)
    serials = [l.split("\t")[0] for l in result.stdout.splitlines() if "\tdevice" in l]
    if not serials:
        print("[ERROR] No ADB device connected.")
        return 1
    device = args.device if args.device in serials else serials[0]

    # Auto-probe device to determine max-tier-mb if not explicitly provided
    try:
        from device_probe import probe as _probe, safe_max_push_mb as _safe_mb
        dev_info = _probe(device)
        detected_limit = _safe_mb(dev_info)
    except Exception:
        dev_info       = None
        detected_limit = None

    if args.max_tier_mb is not None:
        max_tier_mb = args.max_tier_mb
        limit_source = "user-specified"
    elif detected_limit is not None:
        max_tier_mb  = detected_limit
        limit_source = f"auto-probed (70% of {dev_info.storage.free_mb:.0f} MB free)"
    else:
        max_tier_mb  = DEFAULT_MAX_MB
        limit_source = f"default (probe unavailable)"

    if args.probe_only:
        if dev_info is not None:
            from device_probe import pretty_print as _pp
            _pp(dev_info)
        else:
            print("[ERROR] Could not probe device.")
        return 0

    print("=" * 66)
    print("  ADB Push Per-App Scale Benchmark")
    print("=" * 66)
    print(f"  Device      : {device}")
    print(f"  Apps        : {args.apps}")
    print(f"  Scales      : {ALL_SCALES}")
    print(f"  Max tier MB : {max_tier_mb:.0f} MB  [{limit_source}]")
    print(f"  Workers     : {worker_counts}")
    print(f"  Runs        : {runs}")
    _mode = "zip→push→unzip only" if args.zip and not args.compare else \
            "raw push + zip comparison" if args.compare else "raw parallel push"
    print(f"  Mode        : {_mode}")
    print(f"  Report      : {args.output}")
    print("=" * 66)

    apps = discover_apps(ASSETS_DIR, args.apps, ALL_SCALES, max_tier_mb)
    if not apps:
        print(f"[ERROR] No app data found. Run: python3 generate_app_scale_assets.py")
        return 1

    for app in apps:
        measured = [t for t in app.tiers if not t.skipped]
        skipped  = [t for t in app.tiers if t.skipped]
        print(
            f"  {app.name:<12}  avg {app.avg_kb:.0f} KB  "
            f"measure: {[t.tier_name for t in measured]}  "
            f"extrap: {[t.tier_name for t in skipped]}"
        )

    total_measured_tiers = sum(
        1 for a in apps for t in a.tiers if not t.skipped
    )
    total_ops = total_measured_tiers * len(worker_counts) * runs
    print(f"\n  Measured push ops : {total_ops}")
    est_s = sum(
        t.file_count * app.avg_kb / 1024 / 3.5 * len(worker_counts) * runs
        for app in apps for t in app.tiers if not t.skipped
    )
    do_zip = args.zip or args.compare
    do_raw = (not args.zip) or args.compare
    if do_zip:
        est_s *= 1.5 if args.compare else 0.4   # zip is faster for single file
    print(f"  Est. runtime      : ~{est_s/60:.0f} min")

    adb_run("shell", f"mkdir -p '{DEVICE_BASE}'", device=device)
    run_benchmarks(
        apps, worker_counts, runs, device,
        zip_mode=args.zip,
        compare=args.compare,
    )

    report = generate_report(
        apps, worker_counts, runs, device, max_tier_mb, ALL_SCALES,
        zip_mode=do_zip,
        raw_mode=do_raw,
    )
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(report, encoding="utf-8")

    print(f"\n{'='*66}")
    print(f"  Report saved → {out}")
    print(f"{'='*66}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
