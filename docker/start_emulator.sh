#!/usr/bin/env bash
# Boot the Android emulator and wait until it is usable.
#
# Usage: start_emulator.sh [--cold]
#   --cold   ignore any baked snapshot and boot from a clean userdata image
#            (used by the build-time provisioning pass)
set -uo pipefail

AVD_NAME="${AVD_NAME:-digiworld}"
SNAPSHOT_NAME="${SNAPSHOT_NAME:-prebaked}"
EMULATOR_TIMEOUT="${EMULATOR_TIMEOUT:-600}"
GPU_MODE="${GPU_MODE:-swiftshader_indirect}"
EMULATOR_MEMORY_MB="${EMULATOR_MEMORY_MB:-4096}"
EMULATOR_CORES="${EMULATOR_CORES:-4}"
SNAPSHOT_DIR="/root/.android/avd/${AVD_NAME}.avd/snapshots/${SNAPSHOT_NAME}"

COLD=false
if [ "${1:-}" = "--cold" ]; then
    COLD=true
fi

if [ ! -e /dev/kvm ]; then
    cat >&2 <<'EOF'
ERROR: /dev/kvm is not available inside the container.

The x86_64 Android emulator needs hardware virtualisation. Run the container
with `--device /dev/kvm` on a Linux host where KVM is enabled, and make sure
your user can access /dev/kvm (`ls -l /dev/kvm`; usually the `kvm` group).
EOF
    exit 1
fi

adb start-server > /dev/null 2>&1

SNAPSHOT_OPTS=(-no-snapshot)
if [ "${COLD}" = false ] && [ -d "${SNAPSHOT_DIR}" ]; then
    # -no-snapshot-save keeps every container run isolated: changes made during
    # an evaluation are discarded instead of mutating the baked snapshot.
    SNAPSHOT_OPTS=(-snapshot "${SNAPSHOT_NAME}" -no-snapshot-save)
    echo "==> Booting emulator '${AVD_NAME}' from snapshot '${SNAPSHOT_NAME}'..."
else
    echo "==> Cold-booting emulator '${AVD_NAME}'..."
fi

OPTIONS=(
    -no-audio
    -no-boot-anim
    -memory "${EMULATOR_MEMORY_MB}"
    -cores "${EMULATOR_CORES}"
    -accel on
    -gpu "${GPU_MODE}"
    -camera-back none
    -camera-front none
    "${SNAPSHOT_OPTS[@]}"
)

if [ "${ENABLE_VNC:-false}" = "true" ] || [ "${ENABLE_VNC:-false}" = "1" ]; then
    export DISPLAY="${DISPLAY:-:0}"
else
    OPTIONS+=(-no-window)
fi

nohup emulator -avd "${AVD_NAME}" "${OPTIONS[@]}" >> /var/log/emulator.log 2>&1 &
EMULATOR_PID=$!

echo "==> Waiting for emulator to boot (timeout: ${EMULATOR_TIMEOUT}s)..."
start_time=$(date +%s)
while true; do
    if ! kill -0 "${EMULATOR_PID}" 2>/dev/null; then
        echo "ERROR: emulator process exited. Last log lines:" >&2
        tail -n 40 /var/log/emulator.log >&2
        exit 1
    fi

    if [ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ]; then
        echo "==> Emulator booted."
        break
    fi

    elapsed=$(( $(date +%s) - start_time ))
    if [ "${elapsed}" -gt "${EMULATOR_TIMEOUT}" ]; then
        echo "ERROR: emulator boot timed out after ${EMULATOR_TIMEOUT}s. Last log lines:" >&2
        tail -n 40 /var/log/emulator.log >&2
        exit 1
    fi
    sleep 4
done

# Scenario reset writes directly into each app's data directory, which needs a
# root adbd and a permissive SELinux policy.
adb root > /dev/null 2>&1 || true
adb wait-for-device
sleep 2
adb shell setenforce 0 > /dev/null 2>&1 || true

# Animations make screenshots non-deterministic and slow every step down.
adb shell settings put global window_animation_scale 0.0 > /dev/null 2>&1 || true
adb shell settings put global transition_animation_scale 0.0 > /dev/null 2>&1 || true
adb shell settings put global animator_duration_scale 0.0 > /dev/null 2>&1 || true

adb devices -l
echo "==> Emulator ready."
