#!/usr/bin/env bash
# =============================================================================
#  bench.sh — Fire-and-forget asset push benchmark
# =============================================================================
#  Runs the full pipeline and prints a final report summary.
#  Zero interaction required after launch.
#
#  Usage:
#    ./bench.sh                          # all apps, all scales, raw push + local copy
#    ./bench.sh --apps eats music        # only those apps
#    ./bench.sh --zip                    # zip-only: measure zip→push→unzip (no raw push)
#    ./bench.sh --compare                # run BOTH raw push AND zip side-by-side
#    ./bench.sh --copy-only              # local copy only (no emulator needed)
#    ./bench.sh --scales 1000 2000 5000  # custom scale tiers
#    ./bench.sh --runs 1 --apps eats     # quick smoke test
#    ./bench.sh --probe-only             # just show device hardware limits
#    ./bench.sh --help
#
#  All flags are forwarded to run_benchmark.py — see run_benchmark.py --help.
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUNNER="$SCRIPT_DIR/run_benchmark.py"
ADB_REPORT="$SCRIPT_DIR/adb_push_benchmark_report.md"
COPY_REPORT="$SCRIPT_DIR/parallel_copy_benchmark_report.md"
LOG_FILE="$SCRIPT_DIR/bench_run.log"

# ─── Colours ──────────────────────────────────────────────────────────────────
GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"
CYAN="\033[0;36m";  BOLD="\033[1m";      RESET="\033[0m"

info()    { echo -e "${CYAN}[bench]${RESET} $*"; }
success() { echo -e "${GREEN}[bench]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[bench]${RESET} $*"; }
error()   { echo -e "${RED}[bench]${RESET} $*" >&2; }
section() { echo -e "\n${BOLD}${CYAN}━━━ $* ━━━${RESET}"; }

# ─── Show help ────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
    python3 "$RUNNER" --help
    exit 0
fi

# ─── Detect copy-only / probe-only early ──────────────────────────────────────
COPY_ONLY=0
PROBE_ONLY=0
for arg in "$@"; do
    [[ "$arg" == "--copy-only"  ]] && COPY_ONLY=1
    [[ "$arg" == "--probe-only" ]] && PROBE_ONLY=1
done

# ─── Timestamps ───────────────────────────────────────────────────────────────
START_TS=$(date +%s)
RUN_DATE=$(date "+%Y-%m-%d %H:%M:%S")

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║         Andojo Asset Push Benchmark  ─  $RUN_DATE  ${RESET}${BOLD}║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  Log file  : ${CYAN}$LOG_FILE${RESET}"
echo -e "  Reports   : ${CYAN}$ADB_REPORT${RESET}"
echo -e "              ${CYAN}$COPY_REPORT${RESET}"
echo ""

# ─── Prerequisites ────────────────────────────────────────────────────────────
section "Prerequisites"

# Python 3
if ! command -v python3 &>/dev/null; then
    error "python3 not found. Install Python 3.9+ and re-run."
    exit 1
fi
PY_VER=$(python3 -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')")
info "Python $PY_VER ✓"

# adb (only required for non-copy-only)
if [[ "$COPY_ONLY" -eq 0 ]]; then
    if ! command -v adb &>/dev/null; then
        error "adb not found in PATH."
        error "  macOS:  brew install android-platform-tools"
        error "  Linux:  sudo apt install adb"
        exit 1
    fi
    info "adb $(adb version 2>&1 | head -1 | awk '{print $NF}') ✓"

    # Wait for an emulator (up to 60 s)
    info "Looking for ADB device …"
    DEVICE=""
    for i in $(seq 1 12); do
        DEVICE=$(adb devices 2>/dev/null | awk '/\tdevice/{print $1; exit}')
        if [[ -n "$DEVICE" ]]; then break; fi
        if [[ "$i" -eq 1 ]]; then
            warn "No device yet — waiting (start your emulator now) …"
        fi
        sleep 5
    done

    if [[ -z "$DEVICE" ]]; then
        error "No ADB device found after 60 s."
        error "  Start an Android emulator or connect a device, then re-run."
        exit 1
    fi
    success "Device: $DEVICE ✓"

    # Probe hardware
    section "Device Hardware"
    python3 "$SCRIPT_DIR/device_probe.py" || true   # non-fatal if probe fails
fi

# ─── Probe-only shortcut ──────────────────────────────────────────────────────
if [[ "$PROBE_ONLY" -eq 1 ]]; then
    success "Probe complete."
    exit 0
fi

# ─── Run the pipeline (tee to log) ────────────────────────────────────────────
section "Running benchmark pipeline"
info "Args passed to run_benchmark.py: $*"
info "Full output is also saved to: $LOG_FILE"
echo ""

python3 "$RUNNER" "$@" 2>&1 | tee "$LOG_FILE"
EXIT_CODE=${PIPESTATUS[0]}

# ─── Final summary ────────────────────────────────────────────────────────────
END_TS=$(date +%s)
ELAPSED=$(( END_TS - START_TS ))
ELAPSED_FMT=$(printf "%02d:%02d:%02d" $(( ELAPSED/3600 )) $(( (ELAPSED%3600)/60 )) $(( ELAPSED%60 )))

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
if [[ "$EXIT_CODE" -eq 0 ]]; then
    echo -e "${BOLD}${GREEN}║  Benchmark complete                                      ║${RESET}"
else
    echo -e "${BOLD}${YELLOW}║  Benchmark finished with warnings/errors                 ║${RESET}"
fi
echo -e "${BOLD}╠══════════════════════════════════════════════════════════╣${RESET}"
echo -e "  Elapsed : ${ELAPSED_FMT}"
echo -e "  Log     : $LOG_FILE"

if [[ "$COPY_ONLY" -eq 0 && -f "$ADB_REPORT" ]]; then
    echo ""
    echo -e "  ${BOLD}ADB Push Report${RESET}"
    echo -e "  → $ADB_REPORT"
    # Print the summary matrix (lines between the first table header and the next ---)
    echo ""
    awk '/^## Summary/,/^---/' "$ADB_REPORT" | grep -v "^---" | head -20 || true
fi

if [[ -f "$COPY_REPORT" ]]; then
    echo ""
    echo -e "  ${BOLD}Local Copy Report${RESET}"
    echo -e "  → $COPY_REPORT"
    echo ""
    awk '/^## Summary/,/^---/' "$COPY_REPORT" | grep -v "^---" | head -15 || true
fi

echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""

exit "$EXIT_CODE"
