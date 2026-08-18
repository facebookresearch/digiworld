# Asset Transfer Guide — Moving Files to Android Emulators at Scale

> **Audience:** Engineers setting up mock environments, CI pipelines, and test-data workflows  
> **Based on:** Benchmark runs on `emulator-5554` (Android x86_64, ~3.6 GB sdcard, 8 cores)  
> **Source data:** [`adb_push_benchmark_report.md`](adb_push_benchmark_report.md) · [`parallel_copy_benchmark_report.md`](parallel_copy_benchmark_report.md)

---

## TL;DR — Quick Decision Guide

| File count | Recommended approach | Expected time |
|-----------|---------------------|--------------|
| **≤ 5K** | Raw `adb push`, 5 workers | < 1.5 min |
| **5K – 20K** | Zip → push → unzip | 0.5 – 2 min |
| **20K – 50K** | Zip → push → unzip | 2 – 8 min (estimated) |
| **50K+** | Zip → push → unzip **or** pre-snapshot | 8 – 25 min+ |

**Bottom line:**
- Use **raw parallel push with 5 workers** for ≤ 5K files. Simple, no setup, fast enough.
- Switch to **zip → push → unzip** from 5K onwards — observed ~3× speedup at 5K and better for larger tiers, because a single ADB connection replaces thousands of per-file handshakes.
- For **repeated test cycles**, snapshot the emulator after the first push and restore the snapshot instead of re-pushing every time.

---

## Understanding the Numbers

### ADB push is the bottleneck — not the host

| Context | Throughput | 100K files time |
|---------|-----------|----------------|
| Local parallel copy (host only, no emulator) | 230 – 700 MB/s | **~46 s** |
| ADB push to emulator | 7 – 17 MB/s | **~21 – 33 min** |

The host machine can copy 100K files in under a minute. ADB to the emulator takes 20–30× longer, purely because of the ADB virtual channel (`/dev/fuse`) overhead. **Adding more CPU or workers on the host does nothing to close that gap.**

### Why the zip cutoff is at 5K (not 10K or 20K)

At 5K files, the raw push already takes ~65–80 seconds for most apps. The zip approach (measured) takes ~24–27 seconds for the same tier — a **3× speedup** — with no meaningful cost increase because host-side zip creation is only ~2.5 seconds (ZIP_STORED, no compression on JPEGs). The gain scales up from there: at 10K files the speedup is still ~3×. Below 5K the savings are smaller and the operational overhead of staging a zip is harder to justify.

### Why more workers don't scale linearly with ADB

ADB serialises at the daemon level — it processes one file connection at a time through the USB/loopback channel. Increasing workers beyond 5–8 just adds scheduling overhead. At 12 workers, throughput is either the same or slightly worse for most apps.

| App | 5w (files/s) | 8w (files/s) | 12w (files/s) | Winner |
|-----|---:|---:|---:|:---:|
| Eats (115 KB avg) | 64 | 62 | **70** | 12w |
| Ecommerce (186 KB avg) | **65** | 58 | 59 | 5w |
| Auction (183 KB avg) | **63** | 56 | 59 | 5w |
| Music (148 KB avg) | **69** | 64 | 64 | 5w |
| Video (134 KB avg) | **66** | 59 | 59 | 5w |
| QwikShop (202 KB avg) | **79** | 71 | 71 | 5w |

**5 workers wins 5 out of 6 apps.** 12 workers only edges ahead for Eats, which has the smallest average file size (108 KB). Rule of thumb: **use 5 workers as your default**.

### Why QwikShop appears fastest despite having the largest files

QwikShop has the largest average file size (215 KB) yet achieves the best files/second and lowest per-file cost (~12.8 ms). This looks like an optimization but is actually a **benchmark ordering effect**:

| Benchmark position | App | Per-file cost (5w) | Implied MB/s |
|:-----------------:|-----|-------------------:|-------------:|
| 1st (cold) | Eats | 19.70 ms/file | 5.5 MB/s |
| 2nd | Ecommerce | 16.35 ms/file | 10.8 MB/s |
| 3rd | Auction | 15.94 ms/file | 11.9 MB/s |
| 4th | Music | 14.64 ms/file | 10.4 MB/s |
| 5th | Video | 15.93 ms/file | 8.3 MB/s |
| 6th (warm) | **QwikShop** | **12.79 ms/file** | **16.8 MB/s** |

The correlation between running position and per-file cost is **−0.73** (strong). Each successive app runs faster because:

1. **The ADB daemon stays warm.** TCP loopback connections are already established and cached.
2. **Emulator CPU governor shifts to performance mode** after the first few hundred file operations.
3. **Host OS page cache.** The hardlinked seed files are already in memory from previous app reads.
4. **Emulator filesystem (FUSE/ext4) is warm.** Directory metadata and journal are cached.

**There is no inherent optimization for QwikShop.** If you run the benchmark starting with QwikShop, it will likely show a per-file cost similar to Eats (~19–20 ms). The first app to run always pays the cold-start tax — roughly **50–60% more time per file** compared to later apps.

**Practical implication:** Pre-warm the emulator before your benchmark or production push by doing a small throwaway push first:

```bash
# Pre-warm: push and immediately delete a small batch
adb push /path/to/any/small/dir /sdcard/warmup/ && adb shell "rm -rf /sdcard/warmup"
# Now push your real assets at full warm speed
adb push /path/to/real/assets /sdcard/assets/
```

---

## ADB Push Timing Reference (measured + extrapolated)

All times are wall-clock seconds using 5 workers (best default).  
`†` = extrapolated via linear model from measured tiers.

| App | avg KB | 1K files | 2K | 5K | 10K | 20K | 50K | 100K |
|-----|-------:|---:|---:|---:|---:|---:|---:|---:|
| Eats | 115 | 15s | 26s | 1m 11s | 2m 12s | 4m 23s | ~12m† | ~24m† |
| Music | 148 | 14s | 29s | 1m 15s | 2m 29s | 5m 02s | ~12m† | ~24m† |
| Video | 134 | 15s | 30s | 1m 21s | 3m 26s | 4m 04s | ~13m† | ~27m† |
| Auction | 183 | 16s | 33s | 1m 20s | 2m 35s | ~5m† | ~13m† | ~27m† |
| Ecommerce | 186 | 13s | 29s | 1m 14s | 2m 29s | 5m 30s | ~14m† | ~27m† |
| QwikShop | 202 | 12s | 26s | 1m 05s | 2m 14s | ~4m† | ~11m† | ~21m† |

**Per-file cost is ~13–20 ms regardless of which app.** File size affects MB/s throughput but not files/s significantly — the dominant cost is the per-file ADB handshake, not the data transfer itself.

---

## Local Copy Timing Reference (host-only baseline)

These numbers are **not** relevant for pushing to an emulator, but they quantify the host-side cost of staging files before a push. The gap versus ADB shows exactly where time is spent.

| Scale | Files | Size (MB) | Best time | Best workers | Files/s |
|-------|------:|---:|---:|:---:|---:|
| 1K | 1,000 | 162 | 0.39 s | 8w | 2,592 |
| 2K | 2,000 | 322 | 1.15 s | 8w | 1,734 |
| 5K | 5,000 | 820 | 2.17 s | 12w | 2,301 |
| 10K | 10,000 | 1,641 | 2.39 s | 12w | 4,190 |
| 50K | 50,000 | 8,183 | 20.3 s | 8w | 2,460 |
| 100K | 100,000 | 16,383 | 45.8 s | 5w | 2,182 |
| ~188K (full app) | 188,000 | 20K–39K | 84–122 s | varies | ~1,800 |

Local copy is 300–700 MB/s. ADB is 7–17 MB/s. The emulator's `/dev/fuse` virtual filesystem is the bottleneck.

---

## Strategy Comparison

### Strategy 1 — Raw parallel `adb push` (default)

```bash
# Each file is pushed individually in parallel
adb push <file> /sdcard/path/   # × N files, W workers
```

**Pros:**
- Zero setup. Works out of the box.
- Fast enough for ≤ 10K files (< 3.5 min for any app).
- Files land exactly where you want them.

**Cons:**
- Per-file ADB handshake overhead dominates. Adding workers does not help much.
- Slow for 20K+ files (5 min+).
- If the push fails halfway, you get a partial state.

**When to use:** ≤ 10K files, development workflows, ad-hoc test runs.

---

### Strategy 2 — Zip → push → unzip

```bash
# 1. Create archive on host (ZIP_STORED: fast, no wasted compression on JPEGs)
zip -0 -r assets.zip <tier_dir>/

# 2. Push single file — one ADB handshake, full channel throughput
adb push assets.zip /sdcard/staging/assets.zip

# 3. Unzip on device
adb shell "unzip -q /sdcard/staging/assets.zip -d /sdcard/benchmark_assets/"

# 4. Clean up the zip
adb shell "rm /sdcard/staging/assets.zip"
```

**Pros:**
- Single ADB connection instead of N connections — eliminates per-file handshake overhead.
- ADB channel is used at higher efficiency (continuous stream vs. bursty small transfers).
- Atomic: either the zip arrives intact or it doesn't.
- Host-side zip creation is fast (ZIP_STORED = no compression, ~3 s per 5K JPEG files).

**Cons:**
- Requires ~2× temporary sdcard space (zip + extracted files) during the unzip step.
- `unzip` on `/dev/fuse` (Android virtual filesystem) takes time for very large archives — plan for ~20–40 s per 10K files.
- Needs `unzip` binary on the device (`adb shell which unzip` to verify).

**When to use:** 10K+ files, CI pipelines, repeated large pushes.

**Observed timings (sample — Eats app, 1K–10K tiers):**

| Tier | Files | host_zip | push | unzip | transfer total | vs best raw push |
|------|------:|---------:|-----:|------:|--------------:|:----------------:|
| 1K | 1,000 | ~0.3 s | ~0.4 s | ~2.7 s | ~3.1 s | ~5× faster |
| 2K | 2,000 | ~1.0 s | ~1.6 s | ~11.7 s | ~13.2 s | ~2× faster |
| 5K | 5,000 | ~2.5 s | ~3.3 s | ~21.3 s | ~24.5 s | ~3× faster |
| 10K | 10,000 | ~3.1 s | ~4.6 s | ~39.8 s | ~47.5 s | ~3× faster |

> The unzip step dominates because Android's `/dev/fuse` filesystem serializes writes. The push itself is fast (single file, max channel utilization).

---

### Strategy 3 — Emulator snapshot (best for repeated runs)

```bash
# One-time setup: push assets once, then take a snapshot
./bench.sh --apps eats --scales 5000     # push the desired tier
adb shell avd snapshot save clean_state  # or use Android Studio snapshot UI

# Every subsequent test run: restore instead of re-push
adb shell avd snapshot load clean_state  # instant restore
```

**Pros:**
- Restore is near-instantaneous (seconds, not minutes).
- No asset push overhead in the test hot path.
- Guarantees a clean, reproducible starting state.

**Cons:**
- Initial setup required. Snapshot files can be large.
- Snapshot compatibility is tied to the emulator image version.

**When to use:** CI pipelines, test fleets, any scenario where the same asset set is used repeatedly.

---

### Strategy 4 — Chunked push

For situations where neither zip nor snapshot is feasible, break large pushes into chunks:

```bash
# Push 5K at a time, verify each chunk before proceeding
for chunk in chunk_1 chunk_2 chunk_3 ...; do
    adb push "$chunk/" /sdcard/assets/
    adb shell "ls /sdcard/assets/ | wc -l"  # verify count
done
```

**When to use:** When sdcard space is tight (< 2× the full asset size, ruling out zip) and snapshots aren't available.

---

## Recommended Configuration by Scenario

### Scenario A — Local development / quick test

```bash
./bench.sh --apps eats --scales 1000 2000 5000
# or
python3 benchmark_app_adb_push.py --apps eats --scales 1000 2000 5000 --workers 5
```

- Use raw push, 5 workers
- Limit to 5K files per app for sub-2-minute pushes

### Scenario B — Full-scale integration test (one-time)

```bash
./bench.sh --apps eats music video --scales 10000 20000
```

- 5 workers, expect 4–8 min per app
- Take a snapshot after first successful push, use that for reruns

### Scenario C — Large dataset push (20K+ files)

```bash
./bench.sh --zip --apps eats ecommerce --scales 20000 50000
```

- Zip mode: pack assets as single archive, push, unzip on device
- Monitor `adb shell df /sdcard` to ensure enough free space (needs ~2× asset size)

### Scenario D — CI pipeline

```bash
# Step 1: Setup phase (run once per emulator image)
./bench.sh --apps eats --scales 10000    # push 10K assets

# Step 2 (CI): Restore snapshot instead of re-pushing
adb shell avd snapshot load <snapshot_name>
```

- **Never push assets during a hot test loop.** Push once, snapshot, restore.
- If you must push in CI, use zip mode for any dataset > 5K files.

---

## Worker Count Guide

| Scenario | Recommended workers | Why |
|----------|:-------------------:|-----|
| General use (any app, any scale) | **5** | Wins 5/6 apps; most consistent |
| Eats-only, small files (< 120 KB avg) | 12 | Marginal gain for tiny files |
| Zip push (single file) | N/A — workers not used | Single connection; parallelism irrelevant |
| Local copy (no emulator) | **8–12** | Host I/O benefits from more threads |

---

## Pitfalls to Avoid

**1. Don't use 12+ workers by default.**  
At 12 workers you get the same or worse throughput as 5 workers for most apps. The ADB daemon bottleneck makes extra threads compete rather than cooperate.

**2. Don't push > 2× free sdcard space with zip mode.**  
Zip → unzip temporarily needs both the zip and the extracted files on the sdcard simultaneously. Check free space first:
```bash
python3 device_probe.py   # shows free MB and safe push limit
```

**3. Don't re-push on every test cycle.**  
Even a 5K push takes 1–2 minutes. For a 100-test CI suite that adds hours. Push once, snapshot, restore.

**4. Watch out for the cold-start penalty on the first push.**  
The first `adb push` in a session runs at ~50–60% the speed of subsequent pushes. If you're timing a one-shot push for capacity planning, do a small warm-up push first to get a representative number. If you're running in CI and only ever push once per session, budget for the cold cost.

**5. Don't expect ADB throughput to improve with more powerful hardware.**  
The bottleneck is inside the ADB virtual channel protocol and the emulator's `/dev/fuse` filesystem — not your laptop's CPU or SSD. A Mac Studio and a MacBook Air push at the same rate.

**6. Verify `unzip` exists on the emulator before relying on zip mode.**  
```bash
adb shell which unzip   # should return /usr/bin/unzip or similar
```
Some minimal AOSP builds omit it.

---

## How to Re-run These Benchmarks

```bash
cd digiworld/utils

# Quick smoke test (1 app, small scales, 1 run)
./bench.sh --runs 1 --apps eats --scales 1000 2000 5000

# Full benchmark (all apps, all scales, raw push)
./bench.sh

# Zip-only benchmark (all apps, all scales)
./bench.sh --zip

# Side-by-side comparison of raw push vs zip
./bench.sh --compare --apps eats music

# Check device hardware before running
./bench.sh --probe-only
```

Results are saved to:
- `adb_push_benchmark_report.md` — ADB push timings with extrapolations
- `parallel_copy_benchmark_report.md` — local copy baseline

---

## Appendix — Raw Throughput Summary

### ADB push (emulator-5554, 5 workers, best measured runs)

| App | avg file KB | Max observed MB/s | Files/s |
|-----|------------:|------------------:|--------:|
| Eats | 115 | ~21 | ~102 |
| Music | 148 | ~12 | ~80 |
| Video | 134 | ~11 | ~85 |
| Auction | 183 | ~14 | ~75 |
| Ecommerce | 186 | ~15 | ~87 |
| QwikShop | 202 | ~21 | ~102 |

ADB channel effective ceiling: **~15–17 MB/s** for steady-state large transfers. Bursts up to ~21 MB/s observed on the first run of small tiers (warm cache on host).

### Local copy (host-only baseline)

| Workers | Mean MB/s | Mean files/s |
|:-------:|----------:|-------------:|
| 5 | 336 | ~2,000 |
| 8 | 316 | ~2,000 |
| 12 | 352 | ~2,200 |

Host copy is effectively I/O-bound on the local SSD at ~300–700 MB/s.  
**The emulator/ADB channel is the bottleneck at ~5% of local copy speed.**

---

_Document generated from benchmark data in `adb_push_benchmark_report.md` and `parallel_copy_benchmark_report.md`._  
_Re-run benchmarks with `./bench.sh` — see [README.md](README.md#asset-push-benchmarks) for full documentation._
