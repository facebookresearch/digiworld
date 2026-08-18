#!/usr/bin/env python3
# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
device_probe.py — Query hardware limits from a connected ADB device at runtime
===============================================================================
Probes:
  • Storage  — /sdcard total, used, free (MB)
  • RAM      — MemTotal, MemAvailable from /proc/meminfo
  • CPU      — core count (nproc) + ABI (ro.product.cpu.abi)

Can be used as an importable module OR run directly as a CLI tool.

As a module
-----------
    from device_probe import probe, safe_max_push_mb

    info = probe("emulator-5554")       # returns DeviceInfo dataclass
    limit = safe_max_push_mb(info)      # 70% of free /sdcard space
    print(info)                         # pretty table

As a CLI
--------
    python3 device_probe.py
    python3 device_probe.py --device emulator-5556
    python3 device_probe.py --json
    python3 device_probe.py --print-max-mb   # just print the safe limit number
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import asdict, dataclass
from typing import Optional

# Default safety margin: use at most this fraction of free sdcard space
DEFAULT_SAFETY_FACTOR = 0.70


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class StorageInfo:
    path:     str
    total_mb: float
    used_mb:  float
    free_mb:  float

    @property
    def used_pct(self) -> float:
        return (self.used_mb / self.total_mb * 100) if self.total_mb > 0 else 0.0


@dataclass
class MemoryInfo:
    total_mb:     float
    available_mb: float

    @property
    def used_mb(self) -> float:
        return self.total_mb - self.available_mb

    @property
    def available_pct(self) -> float:
        return (self.available_mb / self.total_mb * 100) if self.total_mb > 0 else 0.0


@dataclass
class CpuInfo:
    cores: int
    abi:   str


@dataclass
class DeviceInfo:
    serial:  str
    storage: Optional[StorageInfo]
    memory:  Optional[MemoryInfo]
    cpu:     Optional[CpuInfo]

    def safe_push_mb(self, safety_factor: float = DEFAULT_SAFETY_FACTOR) -> Optional[float]:
        """Return how many MB we can safely push (safety_factor × free storage)."""
        if self.storage is None:
            return None
        return self.storage.free_mb * safety_factor


# ---------------------------------------------------------------------------
# ADB helper
# ---------------------------------------------------------------------------

def _adb(device: str, *args: str, timeout: int = 10) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["adb", "-s", device, *args],
        capture_output=True, text=True, timeout=timeout,
    )


def _first_device() -> Optional[str]:
    r = subprocess.run(["adb", "devices"], capture_output=True, text=True, timeout=10)
    for line in r.stdout.splitlines():
        if "\tdevice" in line:
            return line.split("\t")[0]
    return None


# ---------------------------------------------------------------------------
# Individual probes
# ---------------------------------------------------------------------------

def probe_storage(device: str, path: str = "/sdcard") -> Optional[StorageInfo]:
    """
    Parse `adb shell df <path>`.

    Android df output variants:
      Filesystem    1K-blocks     Used Available Use% Mounted on
      /dev/fuse      5906400  4123240   1783160  70% /sdcard

      /sdcard: 5906400 blocks, 4123240 used, 1782920 available (block size 4096)
    """
    r = _adb(device, "shell", "df", path)
    if r.returncode != 0 or not r.stdout.strip():
        return None

    # Find the data line (contains the mount point or "fuse" in filesystem name)
    lines = r.stdout.strip().splitlines()
    data_line: Optional[str] = None
    for line in reversed(lines):
        low = line.lower()
        if path in low or "fuse" in low or "sdcard" in low:
            data_line = line
            break
    if data_line is None and lines:
        data_line = lines[-1]

    if not data_line:
        return None

    # Extract all integers from the line
    nums = [int(m) for m in re.findall(r"\b(\d{4,})\b", data_line)]
    # Expect at least: total, used, available (in 1K blocks)
    if len(nums) < 3:
        return None

    total_kb, used_kb, avail_kb = nums[0], nums[1], nums[2]
    return StorageInfo(
        path=path,
        total_mb=total_kb / 1_024,
        used_mb=used_kb  / 1_024,
        free_mb=avail_kb / 1_024,
    )


def probe_memory(device: str) -> Optional[MemoryInfo]:
    """Parse /proc/meminfo for MemTotal and MemAvailable (kB)."""
    r = _adb(device, "shell", "cat", "/proc/meminfo")
    if r.returncode != 0 or not r.stdout.strip():
        return None

    total_kb: Optional[int]     = None
    available_kb: Optional[int] = None

    for line in r.stdout.splitlines():
        m = re.match(r"^(MemTotal|MemAvailable):\s+(\d+)\s+kB", line)
        if m:
            val = int(m.group(2))
            if m.group(1) == "MemTotal":
                total_kb = val
            else:
                available_kb = val
        if total_kb is not None and available_kb is not None:
            break

    # Fallback: MemFree if MemAvailable not present
    if total_kb is not None and available_kb is None:
        for line in r.stdout.splitlines():
            m = re.match(r"^MemFree:\s+(\d+)\s+kB", line)
            if m:
                available_kb = int(m.group(1))
                break

    if total_kb is None:
        return None

    return MemoryInfo(
        total_mb=total_kb     / 1_024,
        available_mb=(available_kb or 0) / 1_024,
    )


def probe_cpu(device: str) -> Optional[CpuInfo]:
    """Query CPU core count (nproc) and ABI (ro.product.cpu.abi)."""
    r_cores = _adb(device, "shell", "nproc")
    r_abi   = _adb(device, "shell", "getprop", "ro.product.cpu.abi")

    cores = 0
    if r_cores.returncode == 0:
        try:
            cores = int(r_cores.stdout.strip())
        except ValueError:
            pass

    abi = r_abi.stdout.strip() if r_abi.returncode == 0 else "unknown"
    return CpuInfo(cores=cores, abi=abi)


def probe(device: Optional[str] = None) -> DeviceInfo:
    """
    Run all probes against the given device (auto-detected if None).
    Returns a DeviceInfo dataclass. Individual fields may be None if
    the probe failed (e.g. adb not connected).
    """
    if device is None:
        device = _first_device()
    if device is None:
        return DeviceInfo(serial="<none>", storage=None, memory=None, cpu=None)

    return DeviceInfo(
        serial=device,
        storage=probe_storage(device),
        memory=probe_memory(device),
        cpu=probe_cpu(device),
    )


def safe_max_push_mb(
    info: DeviceInfo,
    safety_factor: float = DEFAULT_SAFETY_FACTOR,
) -> Optional[float]:
    """Return the recommended --max-tier-mb value for this device."""
    return info.safe_push_mb(safety_factor)


# ---------------------------------------------------------------------------
# Pretty printer
# ---------------------------------------------------------------------------

def _bar(frac: float, width: int = 20) -> str:
    filled = int(round(frac * width))
    return "█" * filled + "░" * (width - filled)


def pretty_print(info: DeviceInfo, safety_factor: float = DEFAULT_SAFETY_FACTOR) -> None:
    W = 66
    SEP = "─" * W

    def row(label: str, value: str) -> str:
        return f"  {label:<24}{value}"

    print(f"┌{SEP}┐")
    print(f"│  Device Hardware Profile  ─  {info.serial:<34}│")
    print(f"├{SEP}┤")

    # Storage
    st = info.storage
    if st:
        safe_mb = st.free_mb * safety_factor
        pct = st.used_mb / st.total_mb if st.total_mb else 0
        print(f"│  Storage  ({st.path}){'':<{W - 18 - len(st.path)}}│")
        print(f"│{row('  Total', f'{st.total_mb:,.0f} MB'):<{W+2}}│")
        print(f"│{row('  Used', f'{st.used_mb:,.0f} MB  ({st.used_pct:.0f}%)  {_bar(pct)}'):<{W+2}}│")
        print(f"│{row('  Free', f'{st.free_mb:,.0f} MB'):<{W+2}}│")
        print(f"│{row('  Safe push max', f'{safe_mb:,.0f} MB  ({safety_factor*100:.0f}% of free)'):<{W+2}}│")
    else:
        print(f"│{row('  Storage', 'unavailable'):<{W+2}}│")

    print(f"├{SEP}┤")

    # Memory
    mem = info.memory
    if mem:
        pct = mem.used_mb / mem.total_mb if mem.total_mb else 0
        print(f"│  Memory (RAM){'':<{W-14}}│")
        print(f"│{row('  Total', f'{mem.total_mb:,.0f} MB'):<{W+2}}│")
        print(f"│{row('  Available', f'{mem.available_mb:,.0f} MB  ({mem.available_pct:.0f}% free)  {_bar(1 - pct)}'):<{W+2}}│")
    else:
        print(f"│{row('  Memory', 'unavailable'):<{W+2}}│")

    print(f"├{SEP}┤")

    # CPU
    cpu = info.cpu
    if cpu:
        print(f"│  CPU{'':<{W-5}}│")
        print(f"│{row('  Cores', str(cpu.cores)):<{W+2}}│")
        print(f"│{row('  ABI', cpu.abi):<{W+2}}│")
    else:
        print(f"│{row('  CPU', 'unavailable'):<{W+2}}│")

    print(f"├{SEP}┤")

    # Recommendation
    safe_mb = safe_max_push_mb(info, safety_factor)
    if safe_mb is not None:
        print(f"│  Recommended benchmark config:{'':<{W-31}}│")
        print(f"│    --max-tier-mb {safe_mb:.0f}{'':<{W - 20 - len(f'{safe_mb:.0f}')}}│")
        if st:
            print(f"│    ({safety_factor*100:.0f}% of {st.free_mb:.0f} MB free on /sdcard){'':<{W - 31 - len(f'{st.free_mb:.0f}')}}│")
    else:
        print(f"│  Cannot determine recommended config (no ADB connection or storage probe failed){'':<{W-82}}│")

    print(f"└{SEP}┘")


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(
        description="Probe hardware limits (storage, RAM, CPU) on a connected ADB device.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--device",  default=None, help="ADB device serial (auto-detected if omitted)")
    parser.add_argument("--json",    action="store_true", help="Print results as JSON")
    parser.add_argument(
        "--print-max-mb", action="store_true",
        help="Print only the safe --max-tier-mb value (number only; useful for scripting)"
    )
    parser.add_argument(
        "--safety", type=float, default=DEFAULT_SAFETY_FACTOR, metavar="F",
        help=f"Safety factor for safe_push_mb calculation (default: {DEFAULT_SAFETY_FACTOR})"
    )
    args = parser.parse_args()

    # Check adb availability
    try:
        subprocess.run(["adb", "version"], capture_output=True, timeout=5)
    except FileNotFoundError:
        print("[ERROR] adb not found in PATH.", file=sys.stderr)
        return 1

    info = probe(args.device)

    if info.serial == "<none>":
        print("[ERROR] No ADB device detected. Is an emulator running?", file=sys.stderr)
        print("        Run: adb devices", file=sys.stderr)
        return 1

    if args.print_max_mb:
        safe_mb = safe_max_push_mb(info, args.safety)
        if safe_mb is None:
            print("0")
        else:
            print(f"{safe_mb:.0f}")
        return 0

    if args.json:
        d = {
            "serial":  info.serial,
            "storage": asdict(info.storage) if info.storage else None,
            "memory":  asdict(info.memory)  if info.memory  else None,
            "cpu":     asdict(info.cpu)     if info.cpu     else None,
            "safe_push_mb": safe_max_push_mb(info, args.safety),
        }
        print(json.dumps(d, indent=2))
        return 0

    pretty_print(info, args.safety)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
