#!/usr/bin/env bash
# Container entrypoint: bring up the control server, then the emulator.
#
# The server is started first and on purpose: it answers /health with
# {"ok": false, "status": "not_ready"} for as long as this script is still
# working, which is what clients poll on to know when the container is usable.
# Readiness is signalled by the file this script touches at the very end, not by
# the emulator having booted -- there is still work to do after that point.
set -uo pipefail

SERVER_PORT="${SERVER_PORT:-6800}"
APK_DIR="${DIGIWORLD_APK_DIR:-/app/apks}"
# /health only reports ok once this file exists, so that clients cannot start
# sending requests while the device is still being set up.
READY_FILE="${DIGIWORLD_READY_FILE:-/run/digiworld.ready}"
export DIGIWORLD_READY_FILE="${READY_FILE}"

mkdir -p /var/log "$(dirname "${READY_FILE}")"
rm -f "${READY_FILE}"
touch /var/log/emulator.log /var/log/server.log

if [ "${ENABLE_VNC:-false}" = "true" ] || [ "${ENABLE_VNC:-false}" = "1" ]; then
    echo "==> Starting noVNC display stack..."
    /app/docker/start_novnc.sh
fi

echo "==> Starting DigiWorld control server on port ${SERVER_PORT}..."
python3 -m digiworld_eval.local_server --digiworld --host 0.0.0.0 --port "${SERVER_PORT}" \
    >> /var/log/server.log 2>&1 &
SERVER_PID=$!

# Boots from the baked snapshot when there is one, cold otherwise.
/app/docker/start_emulator.sh || exit 1

# A snapshot that fails to restore does not raise an error -- the emulator just
# cold-boots into an empty system, and every task would then fail to reset. So
# check for the apps rather than trusting the snapshot.
installed=$(adb shell pm list packages 2>/dev/null | grep -c andojo)
expected=$(find "${APK_DIR}" -maxdepth 1 -name '*.apk' 2>/dev/null | wc -l)
if [ "${installed}" -eq 0 ]; then
    echo "==> No DigiWorld apps on the device -- provisioning now."
    echo "    (this adds several minutes; build the image with docker/build.sh"
    echo "     to bake them into a snapshot instead)"
    /app/docker/provision_emulator.sh || exit 1
elif [ "${installed}" -lt "${expected}" ]; then
    echo "WARNING: ${installed}/${expected} DigiWorld apps are installed;" >&2
    echo "         tasks for the missing apps will fail." >&2
else
    echo "==> ${installed} DigiWorld apps present."
fi

if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "ERROR: control server exited during startup. Last log lines:" >&2
    tail -n 40 /var/log/server.log >&2
    exit 1
fi

touch "${READY_FILE}"
echo "==> DigiWorld container ready (server on :${SERVER_PORT})."

exec "$@"
