# DigiWorld container image.
#
# Bundles everything an evaluation needs into one container:
#   - Android SDK + a headless x86_64 emulator (AVD, API 33, google_apis)
#   - the 15 DigiWorld mock apps, pre-installed into the AVD
#   - the DigiWorld scenario package and its state data
#   - the HTTP control server (digiworld_eval.local_server) on port 6800
#
# The host talks to the container over HTTP only -- no adb, no Python
# environment, and no DigiWorld checkout are needed on the host side.
#
# Build it with docker/build.sh (which also bakes the emulator snapshot);
# see docker/README.md. Building this Dockerfile directly produces a working
# but *unprovisioned* image: the apps are installed on first boot instead of
# being restored from a snapshot, which makes container startup much slower.

ARG BASE_IMAGE=docker.io/library/openjdk:22-jdk-slim
FROM ${BASE_IMAGE}

ENV DEBIAN_FRONTEND=noninteractive

#=============================================================================
# OS packages
#
# The x11/mesa/alsa libraries are runtime dependencies of the Android emulator
# binary. xvfb/x11vnc/fluxbox/novnc are only used when ENABLE_VNC=true, but are
# small enough to always install.
#
# Package names are Debian bookworm's (what the default base image ships).
# On trixie / Ubuntu noble and later, libasound2 is called libasound2t64.
#=============================================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        wget \
        unzip \
        bzip2 \
        procps \
        net-tools \
        python3 \
        python3-pip \
        libasound2 \
        libdbus-glib-1-2 \
        libdrm2 \
        libgbm1 \
        libnss3 \
        libpulse0 \
        libx11-6 \
        libxcursor1 \
        libxi6 \
        libxkbcommon0 \
        libxshmfence1 \
        libxtst6 \
        fluxbox \
        novnc \
        websockify \
        wmctrl \
        x11-utils \
        x11-xserver-utils \
        x11vnc \
        xauth \
        xvfb \
    && rm -rf /var/lib/apt/lists/*

#=============================================================================
# Android SDK command-line tools
#=============================================================================
ENV ANDROID_SDK_ROOT=/opt/android
ENV ANDROID_HOME=/opt/android
ENV PATH="${PATH}:/opt/android/cmdline-tools/latest/bin:/opt/android/platform-tools:/opt/android/emulator"

ARG CMDLINE_TOOLS_BUILD=11076708
RUN wget -q "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_BUILD}_latest.zip" \
        -O /tmp/cmdline-tools.zip && \
    mkdir -p "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    unzip -q /tmp/cmdline-tools.zip -d "${ANDROID_SDK_ROOT}/cmdline-tools" && \
    mv "${ANDROID_SDK_ROOT}/cmdline-tools/cmdline-tools" "${ANDROID_SDK_ROOT}/cmdline-tools/latest" && \
    rm /tmp/cmdline-tools.zip

#=============================================================================
# SDK packages
#
# SDKMANAGER_ARGS is passed verbatim to every sdkmanager invocation. Behind a
# corporate HTTP proxy, set it to
#   --build-arg SDKMANAGER_ARGS="--proxy=http --proxy_host=<host> --proxy_port=<port>"
# because sdkmanager is a Java program and ignores the http_proxy environment.
#=============================================================================
ARG API_LEVEL=33
ARG SYSTEM_IMAGE_TARGET=google_apis
ARG SYSTEM_IMAGE_ABI=x86_64
ARG SDKMANAGER_ARGS=""

ENV ANDROID_SYSTEM_IMAGE="system-images;android-${API_LEVEL};${SYSTEM_IMAGE_TARGET};${SYSTEM_IMAGE_ABI}"

# platform-tools provides adb; the platform is what avdmanager resolves the AVD
# against. Nothing here builds APKs, so build-tools is deliberately left out.
RUN yes | sdkmanager ${SDKMANAGER_ARGS} --licenses > /dev/null && \
    sdkmanager ${SDKMANAGER_ARGS} --install \
        "platform-tools" \
        "platforms;android-${API_LEVEL}" \
        "${ANDROID_SYSTEM_IMAGE}"

#=============================================================================
# Android emulator (pinned)
#
# Installed from the emulator archive rather than `sdkmanager emulator` so that
# builds are reproducible and don't silently pick up a regressed release.
# Build numbers: https://developer.android.com/studio/emulator_archive
# To move to another build, override all three args together.
#=============================================================================
ARG EMULATOR_BUILD=15261927
ARG EMULATOR_VERSION=36.5.11
ARG EMULATOR_SHA256=faec087d7c23d5b7dee18b505f59e0f4e3dc23dfba4c7eb3551e79ade0bb2406
RUN wget -q "https://dl.google.com/android/repository/emulator-linux_x64-${EMULATOR_BUILD}.zip" \
        -O /tmp/emulator.zip && \
    echo "${EMULATOR_SHA256}  /tmp/emulator.zip" | sha256sum -c - && \
    unzip -q -o /tmp/emulator.zip -d "${ANDROID_SDK_ROOT}" && \
    rm /tmp/emulator.zip && \
    emulator -version | head -1

#=============================================================================
# AVD
#
# The default 6 GB data partition is not enough for 15 apps plus their mock
# data, so it is enlarged here. Snapshot support must stay enabled: the build
# bakes app installation into a snapshot that every container run restores.
#=============================================================================
ARG AVD_NAME=digiworld
ARG AVD_DEVICE=pixel_6
ARG AVD_DATA_PARTITION_MB=8192
ARG AVD_RAM_MB=4096
ARG AVD_CORES=4
ENV AVD_NAME=${AVD_NAME}
# start_emulator.sh passes these to the emulator; keeping them in step with the
# AVD's own config avoids a mismatch that would stop the snapshot restoring.
ENV EMULATOR_MEMORY_MB=${AVD_RAM_MB}
ENV EMULATOR_CORES=${AVD_CORES}

RUN echo "no" | avdmanager create avd \
        --force \
        --name "${AVD_NAME}" \
        --device "${AVD_DEVICE}" \
        --package "${ANDROID_SYSTEM_IMAGE}" && \
    cfg="/root/.android/avd/${AVD_NAME}.avd/config.ini" && \
    sed -i '/^disk\.dataPartition\.size=/d; /^hw\.ramSize=/d; /^hw\.cpu\.ncore=/d; /^fastboot\.forceColdBoot=/d; /^hw\.keyboard=/d' "$cfg" && \
    { \
        echo "disk.dataPartition.size=${AVD_DATA_PARTITION_MB}M"; \
        echo "hw.ramSize=${AVD_RAM_MB}"; \
        echo "hw.cpu.ncore=${AVD_CORES}"; \
        echo "fastboot.forceColdBoot=no"; \
        echo "hw.keyboard=yes"; \
    } >> "$cfg" && \
    cat "$cfg"

#=============================================================================
# Python dependencies
#
# Only what the control server and the scenario layer import at runtime; the
# model-facing half of digiworld_eval (litellm & co.) runs on the host.
#=============================================================================
RUN pip3 install --no-cache-dir --break-system-packages \
        fastapi \
        "uvicorn[standard]" \
        pydantic \
        pillow \
        requests \
        packaging

#=============================================================================
# DigiWorld payload
#
# Ordered cheapest-to-change last so that edits to the server scripts don't
# invalidate the multi-gigabyte state-data and APK layers.
#=============================================================================
WORKDIR /app

# Scenario package + state data. `digiworld.get_project_root()` resolves to
# /app/digiworld, so apk_versions.json has to sit next to the package.
COPY digiworld/pyproject.toml digiworld/apk_versions.json /app/digiworld/
COPY digiworld/digiworld/ /app/digiworld/digiworld/

# Each app's app.json, used to reconstruct deeplink formats at runtime.
# `_find_apps_dir()` walks up from the package directory looking for
# <parent>/apps/auction/app.json, which resolves to /app/apps here.
# .dockerignore prunes everything under apps/ except the app.json files.
COPY apps/ /app/apps/

# Mock app APKs. Kept in the image after provisioning so that a container can
# re-install them if it ever has to boot without the baked snapshot.
COPY digiworld/current_apps/ /app/apks/

# Control server (the same bridge server used for local, non-container runs).
COPY digiworld_eval/ /app/digiworld_eval/

COPY docker/ /app/docker/
RUN chmod +x /app/docker/*.sh

ENV PYTHONPATH=/app/digiworld:/app
ENV DIGIWORLD_APK_DIR=/app/apks
ENV SERVER_PORT=6800
ENV EMULATOR_TIMEOUT=600
ENV GPU_MODE=swiftshader_indirect
ENV SNAPSHOT_NAME=prebaked
# Each app starts on a randomly chosen scenario profile (instead of "default")
# whenever apps are (re)initialised -- at bake time and at any first-boot cold
# provisioning. Override with `-e INIT_APPS_RANDOM_PROFILES=false` at `docker
# run` time for deterministic "default" behaviour.
ENV INIT_APPS_RANDOM_PROFILES=true

# 6800: HTTP control server. 5800: noVNC (only when ENABLE_VNC=true).
EXPOSE 6800 5800

ENTRYPOINT ["/app/docker/entrypoint.sh"]
CMD ["tail", "-f", "/var/log/emulator.log", "/var/log/server.log"]
