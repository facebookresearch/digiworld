#!/usr/bin/env bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
set -euo pipefail

# Setup script: install DigiWorld APKs on a running emulator.
#
# Prerequisites:
#   - DigiWorld APKs present in digiworld/current_apps/ (*.apk)
#   - Android emulator running (visible via `adb devices`)
#   - conda env "digiworld" with the digiworld package installed (see digiworld_eval/README.md)
#
# Usage:
#   bash digiworld_eval/setup_emulator.sh
#
#   # Install only specific apps:
#   bash digiworld_eval/setup_emulator.sh --apps email banking contacts
#
#   # Target a specific device:
#   bash digiworld_eval/setup_emulator.sh --device emulator-5554

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MOCKAPPS_ROOT="$REPO_ROOT"
APK_DIR="${MOCKAPPS_ROOT}/digiworld/current_apps"

DEVICE_FLAG=""
APPS=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --device)
            DEVICE_FLAG="-s $2"
            shift 2
            ;;
        --apps)
            shift
            while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
                APPS="$APPS $1"
                shift
            done
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# ---------------------------------------------------------------------------
# Step 1: Verify prerequisites
# ---------------------------------------------------------------------------

echo "=== DigiWorld Emulator Setup ==="
echo ""

if ! command -v adb &>/dev/null; then
    echo "ERROR: adb not found on PATH."
    echo "  Install Android Studio or Android SDK platform-tools."
    exit 1
fi

DEVICES=$(adb devices 2>/dev/null | grep -w "device" | grep -v "List" || true)
if [ -z "$DEVICES" ]; then
    echo "ERROR: No Android devices/emulators found."
    echo "  Start an emulator via Android Studio or:"
    echo "  emulator -avd <avd_name> -no-boot-anim -gpu auto"
    exit 1
fi
echo "Connected devices:"
echo "$DEVICES"
echo ""

# ---------------------------------------------------------------------------
# Step 2: Verify APKs are present
# ---------------------------------------------------------------------------

# nullglob so an empty dir yields no matches (not a literal "*.apk").
shopt -s nullglob
apk_files=("${APK_DIR}"/*.apk)
apk_count=${#apk_files[@]}

if [ "$apk_count" -lt 15 ]; then
    echo "ERROR: APKs not found or incomplete (${apk_count}/15) in ${APK_DIR}."
    echo "  Place the DigiWorld APK files there before running this script."
    exit 1
fi
echo "Found ${apk_count} APKs in ${APK_DIR}."
echo ""

# ---------------------------------------------------------------------------
# Step 3: Install APKs on emulator
# ---------------------------------------------------------------------------

echo "=== Installing APKs ==="
echo ""

INSTALLED=0
FAILED=0
SKIPPED=0

for apk_path in "${APK_DIR}"/*.apk; do
    apk_name=$(basename "$apk_path")

    # If --apps was specified, filter
    if [ -n "$APPS" ]; then
        match=false
        for app in $APPS; do
            if [[ "$apk_name" == *"$app"* ]]; then
                match=true
                break
            fi
        done
        if [ "$match" = false ]; then
            continue
        fi
    fi

    # Check if already installed by trying to get the package's bundle ID
    # Extract bundle ID from filename pattern: <tag>-release.apk
    echo -n "  Installing ${apk_name}... "

    if adb $DEVICE_FLAG install -r -g "$apk_path" 2>&1 | grep -q "Success"; then
        echo "OK"
        INSTALLED=$((INSTALLED + 1))
    else
        echo "FAILED"
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "=== Done ==="
echo "  Installed: ${INSTALLED}"
if [ "$FAILED" -gt 0 ]; then
    echo "  Failed: ${FAILED}"
fi
echo ""
echo "Next steps:"
echo "  1. Start the local bridge server:"
echo "     conda run -n digiworld python -m digiworld_eval.local_server --port 6800 --digiworld"
echo ""
echo "  2. Run the eval:"
echo "     conda run -n digiworld python -m digiworld_eval.eval \\"
echo "       config=digiworld_eval/configs/my_run.yaml"
