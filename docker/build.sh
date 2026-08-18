#!/usr/bin/env bash
# Build the DigiWorld container image.
#
#   ./docker/build.sh                   # build and bake the emulator snapshot
#   ./docker/build.sh --skip-provision  # build only (slower container startup)
#   IMAGE_TAG=dev ./docker/build.sh     # tag digiworld:dev instead of :latest
#
# Anything after `--` is passed straight to the container runtime's `build`
# command, e.g.  ./docker/build.sh -- --no-cache
#
# The image is produced in two steps because the emulator needs KVM and
# `docker build` cannot pass devices into a build:
#   1. the Dockerfile is built into <image>:<tag>-unprovisioned
#   2. a container is run from it with --device /dev/kvm, which installs the
#      apps and saves an AVD snapshot, and is then committed to <image>:<tag>
#--- end of help ---
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "${SCRIPT_DIR}")"

IMAGE_NAME="${IMAGE_NAME:-digiworld}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
IMAGE="${IMAGE_NAME}:${IMAGE_TAG}"
UNPROVISIONED_IMAGE="${IMAGE_NAME}:${IMAGE_TAG}-unprovisioned"

APK_DIR="${REPO_ROOT}/digiworld/current_apps"
STATE_DATA_DIR="${REPO_ROOT}/digiworld/digiworld/state_data"
EXPECTED_APKS="${EXPECTED_APKS:-15}"
STATE_DATA_MIN_ASSETS="${STATE_DATA_MIN_ASSETS:-1000}"
PROVISION_TIMEOUT="${PROVISION_TIMEOUT:-3600}"

SKIP_PROVISION=false
RUNTIME_ARGS=()
while [ $# -gt 0 ]; do
    case "$1" in
        --skip-provision) SKIP_PROVISION=true; shift ;;
        --) shift; RUNTIME_ARGS+=("$@"); break ;;
        -h|--help)
            sed -n '2,/^#--- end of help ---$/p' "${BASH_SOURCE[0]}" \
                | grep -v '^#--- end of help ---$' | sed 's/^# \{0,1\}//'
            exit 0
            ;;
        *) RUNTIME_ARGS+=("$1"); shift ;;
    esac
done

# --- Container runtime -------------------------------------------------------
if [ -n "${CONTAINER_RUNTIME:-}" ]; then
    RUNTIME="${CONTAINER_RUNTIME}"
elif command -v docker > /dev/null 2>&1; then
    RUNTIME=docker
elif command -v podman > /dev/null 2>&1; then
    RUNTIME=podman
else
    echo "ERROR: neither docker nor podman was found on PATH." >&2
    exit 1
fi

echo "=== DigiWorld image build ==="
echo "  runtime:  ${RUNTIME}"
echo "  image:    ${IMAGE}"
echo "  context:  ${REPO_ROOT}"
echo ""

# --- Preflight: APKs ---------------------------------------------------------
shopt -s nullglob
apks=("${APK_DIR}"/*.apk)
if [ "${#apks[@]}" -lt "${EXPECTED_APKS}" ]; then
    cat >&2 <<EOF
ERROR: expected at least ${EXPECTED_APKS} APKs in
         ${APK_DIR}
       but found ${#apks[@]}.

Put the DigiWorld mock app APKs there (one *.apk per app) and re-run.
EOF
    exit 1
fi
echo "APKs: ${#apks[@]} found."

# --- Preflight: state data ---------------------------------------------------
# state_data (mock data, profiles and ~31k image assets) is stored in Git LFS.
# Without `git lfs pull` the files on disk are small pointer stubs, and the
# image would build "successfully" but ship no usable data -- so check the
# content, not just the file count.
asset_count=$(find "${STATE_DATA_DIR}" -type f \
    \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) 2>/dev/null | wc -l)
sample_img=$(find "${STATE_DATA_DIR}" -type f -iname '*.jpg' -print -quit 2>/dev/null || true)
sample_head=""
if [ -n "${sample_img}" ]; then
    sample_head=$(head -c 64 "${sample_img}" 2>/dev/null | tr -d '\0' || true)
fi
if [ "${asset_count}" -lt "${STATE_DATA_MIN_ASSETS}" ] || \
   [ "${sample_head#*git-lfs}" != "${sample_head}" ]; then
    cat >&2 <<EOF
ERROR: the scenario state data in
         ${STATE_DATA_DIR}
       is missing or is still a set of Git LFS pointers
       (found ${asset_count} image files, expected >= ${STATE_DATA_MIN_ASSETS}).

Fetch it and re-run the build:
    git lfs install && git lfs pull
EOF
    exit 1
fi
echo "State data: ${asset_count} image assets present."
echo ""

# --- Build -------------------------------------------------------------------
BUILD_ARGS=()
[ -n "${BASE_IMAGE:-}" ] && BUILD_ARGS+=(--build-arg "BASE_IMAGE=${BASE_IMAGE}")
[ -n "${SDKMANAGER_ARGS:-}" ] && BUILD_ARGS+=(--build-arg "SDKMANAGER_ARGS=${SDKMANAGER_ARGS}")
for var in http_proxy https_proxy no_proxy HTTP_PROXY HTTPS_PROXY NO_PROXY; do
    [ -n "${!var:-}" ] && BUILD_ARGS+=(--build-arg "${var}=${!var}")
done

target_tag="${IMAGE}"
[ "${SKIP_PROVISION}" = false ] && target_tag="${UNPROVISIONED_IMAGE}"

echo "==> Building ${target_tag} ..."
"${RUNTIME}" build \
    -t "${target_tag}" \
    -f "${SCRIPT_DIR}/Dockerfile" \
    ${BUILD_ARGS[@]+"${BUILD_ARGS[@]}"} \
    ${RUNTIME_ARGS[@]+"${RUNTIME_ARGS[@]}"} \
    "${REPO_ROOT}"

if [ "${SKIP_PROVISION}" = true ]; then
    cat <<EOF

Built ${IMAGE} without provisioning.
The apps will be installed on first container start, which adds several minutes
to startup. Drop --skip-provision to bake them into a snapshot instead.
EOF
    exit 0
fi

# --- Provision + commit ------------------------------------------------------
if [ ! -e /dev/kvm ]; then
    cat >&2 <<EOF
ERROR: /dev/kvm not found, so the emulator snapshot cannot be baked.

Either enable KVM on this host, or rebuild with --skip-provision and accept a
slower container startup. The unprovisioned image is available as
    ${UNPROVISIONED_IMAGE}
EOF
    exit 1
fi
if [ ! -r /dev/kvm ] || [ ! -w /dev/kvm ]; then
    cat >&2 <<EOF
ERROR: /dev/kvm exists but this user cannot read/write it.

    sudo usermod -aG kvm "\$USER"     # then log out and back in

With rootless podman the host group membership is not passed into the
container either; add --group-add keep-groups to the run (see docker/README.md).
EOF
    exit 1
fi

CONTAINER_NAME="digiworld-provision-$$"
KEEP_CONTAINER=false
cleanup() {
    if [ "${KEEP_CONTAINER}" = true ]; then
        return
    fi
    "${RUNTIME}" rm -f "${CONTAINER_NAME}" > /dev/null 2>&1 || true
}
trap cleanup EXIT

# Podman copies the build host's proxy environment into every container it runs
# and `commit` would then bake those values into the published image. Docker has
# no equivalent flag (and no equivalent behaviour).
PROVISION_RUN_ARGS=()
if [ "${RUNTIME}" = podman ]; then
    PROVISION_RUN_ARGS+=(--http-proxy=false)
fi

echo ""
echo "==> Provisioning (installing apps and baking the AVD snapshot)..."
echo "    This boots the emulator once and takes roughly 10-20 minutes."

run_status=0
timeout "${PROVISION_TIMEOUT}" \
    "${RUNTIME}" run \
        --name "${CONTAINER_NAME}" \
        --device /dev/kvm \
        ${PROVISION_RUN_ARGS[@]+"${PROVISION_RUN_ARGS[@]}"} \
        --entrypoint /app/docker/prebake.sh \
        "${UNPROVISIONED_IMAGE}" || run_status=$?

if [ "${run_status}" != "0" ]; then
    KEEP_CONTAINER=true
    cat >&2 <<EOF

ERROR: provisioning failed (exit ${run_status}).

The container has been left in place so you can inspect it:
    ${RUNTIME} logs ${CONTAINER_NAME}
    ${RUNTIME} rm -f ${CONTAINER_NAME}      # when you are done
EOF
    exit 1
fi

echo ""
echo "==> Committing provisioned container to ${IMAGE} ..."
"${RUNTIME}" commit \
    --change 'ENTRYPOINT ["/app/docker/entrypoint.sh"]' \
    --change 'CMD ["tail", "-f", "/var/log/emulator.log", "/var/log/server.log"]' \
    "${CONTAINER_NAME}" "${IMAGE}" > /dev/null

echo ""
echo "=== Built ${IMAGE} ==="
"${RUNTIME}" image inspect -f '  size: {{.Size}} bytes' "${IMAGE}" 2>/dev/null || true
cat <<EOF

Run it:
  ${RUNTIME} run --rm -d --device /dev/kvm -p 127.0.0.1:6800:6800 --name digiworld ${IMAGE}
  until curl -sf http://localhost:6800/health | grep -q '"ok":true'; do sleep 5; done
  python3 docker/smoke_test.py

Watch the screen while it runs:
  ${RUNTIME} run --rm -d --device /dev/kvm \\
      -p 127.0.0.1:6800:6800 -p 127.0.0.1:5800:5800 \\
      -e ENABLE_VNC=true ${IMAGE}
  # then open http://localhost:5800/vnc.html
EOF
