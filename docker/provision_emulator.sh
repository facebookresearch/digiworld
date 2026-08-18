#!/usr/bin/env bash
# Install the DigiWorld mock apps onto a running emulator and initialise each
# one with its default profile.
#
# Run by docker/prebake.sh at image-build time (the result is captured in an
# AVD snapshot), and by the entrypoint as a fallback when no snapshot exists.
#
# It fails on any error rather than continuing: an app that is missing or
# uninitialised does not fail loudly later, it just makes every one of that
# app's tasks fail to reset.
set -uo pipefail

APK_DIR="${DIGIWORLD_APK_DIR:-/app/apks}"

shopt -s nullglob
apks=("${APK_DIR}"/*.apk)
if [ "${#apks[@]}" -eq 0 ]; then
    echo "ERROR: no APKs found in ${APK_DIR}." >&2
    exit 1
fi

echo "==> Installing ${#apks[@]} APKs from ${APK_DIR}..."
installed=0
failed=0
for apk in "${apks[@]}"; do
    name=$(basename "${apk}")
    # -g grants runtime permissions up front so no app can block on a dialog.
    if adb install -r -g "${apk}" > /dev/null 2>&1; then
        echo "    installed ${name}"
        installed=$((installed + 1))
    else
        echo "    FAILED    ${name}" >&2
        failed=$((failed + 1))
    fi
done
echo "==> Installed ${installed} APKs (${failed} failed)."

if [ "${failed}" -gt 0 ]; then
    echo "ERROR: ${failed} APK(s) failed to install." >&2
    exit 1
fi

# Launch each app once so Android creates its data directory before any mock
# data is pushed into it.
echo "==> Launching each app once to create its data directory..."
for bundle_id in $(adb shell pm list packages 2>/dev/null | grep andojo | sed 's/package://' | tr -d '\r'); do
    echo "    ${bundle_id}"
    adb shell monkey -p "${bundle_id}" -c android.intent.category.LAUNCHER 1 > /dev/null 2>&1 || true
    sleep 4
done
adb shell input keyevent 3 > /dev/null 2>&1 || true

# Load the default profile into every app. This makes each app's in-app state
# management (deeplink handlers, session and user stores) fully initialised, so
# that a later scenario reset only has to swap the data.
echo "==> Initialising apps with the default profile..."
if ! python3 /app/docker/init_apps.py; then
    echo "ERROR: app initialisation failed." >&2
    exit 1
fi
adb shell input keyevent 3 > /dev/null 2>&1 || true

echo "==> Provisioning complete."
