#!/usr/bin/env bash
# Copyright (c) Meta Platforms, Inc. and affiliates.
# Start the X / VNC / noVNC stack used when ENABLE_VNC=true, so the emulator
# screen can be watched in a browser at http://localhost:5800/vnc.html
set -uo pipefail

NOVNC_DIR=/usr/share/novnc
VNC_PORT="${VNC_PORT:-5900}"
NOVNC_PORT="${NOVNC_PORT:-5800}"
SCREEN_SIZE="${VNC_SCREEN_SIZE:-1920x1080x24}"

export DISPLAY="${DISPLAY:-:0}"

Xvfb "${DISPLAY}" -screen 0 "${SCREEN_SIZE}" >> /var/log/novnc.log 2>&1 &

echo "==> Waiting for Xvfb on ${DISPLAY}..."
for _ in $(seq 1 30); do
    if xset -display "${DISPLAY}" q > /dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

fluxbox >> /var/log/novnc.log 2>&1 &

echo "==> Waiting for the window manager..."
for _ in $(seq 1 30); do
    if xprop -root _NET_SUPPORTING_WM_CHECK > /dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

# -xkb / -add_keysyms are what make typing in the browser reach the emulator.
x11vnc -display "${DISPLAY}" -forever -shared -rfbport "${VNC_PORT}" -nopw -quiet \
    -xkb -add_keysyms >> /var/log/novnc.log 2>&1 &

websockify --web "${NOVNC_DIR}" "0.0.0.0:${NOVNC_PORT}" "localhost:${VNC_PORT}" \
    >> /var/log/novnc.log 2>&1 &

echo "==> noVNC available on port ${NOVNC_PORT} (/vnc.html)"
