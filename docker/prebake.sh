#!/usr/bin/env bash
# Bake the mock apps into an AVD snapshot.
#
# Runs *inside* a container started from the freshly built image (see
# docker/build.sh), which then commits the container back into the final image.
# It is done this way rather than as a RUN step because `docker build` cannot
# pass --device /dev/kvm into the build, and the emulator needs KVM.
set -uo pipefail

AVD_NAME="${AVD_NAME:-digiworld}"
SNAPSHOT_NAME="${SNAPSHOT_NAME:-prebaked}"
SNAPSHOT_DIR="/root/.android/avd/${AVD_NAME}.avd/snapshots/${SNAPSHOT_NAME}"

echo "=== Baking snapshot '${SNAPSHOT_NAME}' for AVD '${AVD_NAME}' ==="

/app/docker/start_emulator.sh --cold || exit 1
/app/docker/provision_emulator.sh || exit 1

echo "==> Flushing filesystem..."
adb shell sync || true
sleep 3

echo "==> Saving snapshot '${SNAPSHOT_NAME}'..."
if ! adb emu avd snapshot save "${SNAPSHOT_NAME}"; then
    echo "ERROR: snapshot save failed." >&2
    exit 1
fi
sleep 3

if [ ! -d "${SNAPSHOT_DIR}" ]; then
    echo "ERROR: snapshot directory ${SNAPSHOT_DIR} was not created." >&2
    exit 1
fi
echo "==> Snapshot saved ($(du -sh "${SNAPSHOT_DIR}" | cut -f1))."

echo "==> Shutting the emulator down..."
adb emu kill > /dev/null 2>&1 || true
for _ in $(seq 1 30); do
    pgrep -f "qemu-system" > /dev/null 2>&1 || break
    sleep 2
done
pkill -9 -f "qemu-system" > /dev/null 2>&1 || true
adb kill-server > /dev/null 2>&1 || true

# The logs belong to the build, not to the image.
rm -f /var/log/emulator.log /var/log/server.log

echo "=== Snapshot bake complete ==="
