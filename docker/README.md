# Running DigiWorld in a container

> An alternative to the local-emulator setup in
> [digiworld_eval/README.md](../digiworld_eval/README.md). Same evaluation, same
> HTTP API — the emulator, the apps and the control server just live inside a
> Docker or Podman container instead of on your machine.

The image packages an Android emulator, the 15 DigiWorld mock apps (pre-installed
into an AVD snapshot), the scenario data and the control server behind a single
port. The host needs no Android SDK, no `adb` and no `digiworld` package — only
the eval harness itself, and only if you are running an evaluation rather than
driving the container over HTTP directly.

| | Local emulator | Container |
|---|---|---|
| Host needs Android SDK / `adb` | yes | no |
| Host needs the `digiworld` scenario package | yes | no |
| Host needs the eval harness (`digiworld_eval`) | yes | yes |
| Start-up per run | you boot the emulator | seconds, automatic |
| Parallel evaluation | one emulator | one container per worker |
| Works on macOS / Windows | yes | no (needs Linux + KVM) |

---

## 1. Prerequisites

- **Linux with KVM.** The x86_64 Android emulator needs hardware virtualisation:
  ```bash
  ls -l /dev/kvm                      # must exist and be readable/writable by you
  # if it is missing:  sudo modprobe kvm && sudo modprobe kvm_intel   (or kvm_amd)
  # if permission is denied:  sudo usermod -aG kvm "$USER"   (then log out and back in)
  ```
  Docker Desktop on macOS and Windows cannot pass through KVM, so the container
  will not run there. Use the local-emulator setup instead.

  On distributions where `/dev/kvm` is `root:kvm 0660` (Debian, Ubuntu),
  **rootless Podman** additionally needs your `kvm` group membership carried into
  the container — add `--group-add keep-groups` to every `run` (and
  `container_extra_args: ["--group-add", "keep-groups"]` in the eval config).
- **Docker or Podman.** Either works; `build.sh` picks whichever it finds.
- **~8 GB RAM and ~4 CPU cores per container** (the emulator is configured with
  4 vCPUs and 4 GB; see `EMULATOR_CORES` / `EMULATOR_MEMORY_MB`), plus ~50 GB of
  disk for the image and its build.
- **Git LFS**, pulled — the scenario state data is LFS-tracked:
  ```bash
  git lfs install && git lfs pull
  ```
- **The mock app APKs** in `digiworld/current_apps/` (one `*.apk` per app), the
  same location the local setup uses — see
  [digiworld_eval/README.md §3](../digiworld_eval/README.md). The directory is
  gitignored, so the APKs are not part of a checkout.
- **The eval harness on the host**, if you want to run an evaluation rather than
  just drive the container over HTTP:
  ```bash
  pip install -r digiworld_eval/requirements.txt && pip install -e .
  ```
  The `digiworld` scenario package and the Android SDK are *not* needed on the
  host — those live inside the container.

## 2. Build the image

From the repository root:

```bash
./docker/build.sh
```

This runs in two steps and takes roughly 30–45 minutes the first time:

1. `docker build` produces `digiworld:latest-unprovisioned` — Android SDK,
   emulator, AVD, scenario data and APKs.
2. A container is started from it with `--device /dev/kvm`, which installs the
   apps, initialises each one with its default profile, saves an AVD snapshot,
   and is then committed to `digiworld:latest`.

The second step exists because `docker build` cannot pass devices into a build,
and the emulator needs KVM. Every later container start just restores that
snapshot, which takes seconds rather than the ten-plus minutes a cold boot plus
app installation would.

Useful variables and flags:

| | |
|---|---|
| `IMAGE_NAME` / `IMAGE_TAG` | Image to produce (default `digiworld:latest`) |
| `CONTAINER_RUNTIME` | Force `docker` or `podman` |
| `BASE_IMAGE` | Base image to build on (default `docker.io/library/openjdk:22-jdk-slim`) |
| `SDKMANAGER_ARGS` | Extra `sdkmanager` flags, e.g. `--proxy=http --proxy_host=… --proxy_port=…` behind a corporate proxy (`sdkmanager` is a Java program and ignores `http_proxy`) |
| `--skip-provision` | Build without baking the snapshot; apps are installed on first container start instead |
| `-- <args>` | Everything after `--` is passed to the runtime's `build`, e.g. `./docker/build.sh -- --no-cache` |

`http_proxy` / `https_proxy` / `no_proxy` are forwarded into the build automatically
when they are set in your shell.

## 3. Run a container

```bash
docker run --rm -d --device /dev/kvm -p 127.0.0.1:6800:6800 --name digiworld digiworld:latest

# /health reports ok=false until the container is genuinely usable: restoring
# the snapshot takes seconds, a first boot without one takes several minutes
until curl -sf http://localhost:6800/health | grep -q '"ok":true'; do sleep 5; done
```

Check that everything inside the container really works:

```bash
python3 docker/smoke_test.py --screenshot /tmp/digiworld.png
```

It resets a real task, takes a screenshot, dispatches a tap and runs the
verifier, and prints exactly which step failed if one does.

> **Publish the port on `127.0.0.1` only.** `POST /device/command` runs arbitrary
> `adb shell` commands inside the container; the API has no authentication and is
> not meant to be reachable from the network.

### Watching the screen

```bash
docker run --rm -d --device /dev/kvm \
    -p 127.0.0.1:6800:6800 -p 127.0.0.1:5800:5800 \
    -e ENABLE_VNC=true digiworld:latest
# then open http://localhost:5800/vnc.html
```

### Logs

```bash
docker logs -f digiworld                                  # startup progress
docker exec digiworld tail -f /var/log/server.log         # control server
docker exec digiworld tail -f /var/log/emulator.log       # emulator
```

## 4. Run an evaluation against the container

The harness talks to the container over the same HTTP API it uses for a local
emulator, so pointing an existing config at it is a one-line change:

```yaml
init_args:
  server_urls: ["http://localhost:6800"]
```

Alternatively, let the harness start and stop containers itself — set
`container_image` instead of `server_urls`:

```yaml
init_args:
  container_image: digiworld:latest
  container_count: 1          # one Android emulator per container
  max_turns: 20
```

A ready-to-run example is committed at
[`digiworld_eval/configs/mockapps_eval_docker.yaml`](../digiworld_eval/configs/mockapps_eval_docker.yaml):

```bash
export OPENAI_API_KEY=sk-...
python -m digiworld_eval.eval config=digiworld_eval/configs/mockapps_eval_docker.yaml
```

Container `init_args` accepted by `server_env`:

| Key | Default | Meaning |
|---|---|---|
| `container_image` | — | Image to run; enables auto-provisioning |
| `container_count` | `WORLD_SIZE` (1) | Containers to start; also caps `num_rollout_threads` |
| `container_runtime` | auto | `docker` or `podman` |
| `container_device_kvm` | `true` | Pass `--device /dev/kvm` |
| `container_env` | `{}` | Environment variables for the container |
| `container_extra_args` | `[]` | Extra flags for `run`, e.g. `["--memory", "8g"]`, or `["--group-add", "keep-groups"]` for rootless Podman |

Containers are labelled `digiworld-eval=true` and removed on teardown. To clean
up after a crashed run:

```bash
docker ps -a --filter label=digiworld-eval=true
python3 -c "from digiworld_eval.env.provisioners import remove_all_containers; print(remove_all_containers())"
```

### Running several in parallel

Each container is a full emulator, so size the fleet by RAM and cores rather
than by core count alone — roughly 8 GB and 2 cores each:

```yaml
init_args:
  container_image: digiworld:latest
  container_count: 4
# elsewhere in the same config, at the top level:
num_rollout_threads: 4     # must match container_count
```

## 5. The HTTP API

Identical to the local bridge server
(`digiworld_eval/local_server.py`), which is what actually runs inside the
container.

| Endpoint | Purpose |
|---|---|
| `GET /health` | `{"ok": bool, "status": ..., "tasks": int, "active_task": ...}`; `ok` is false until the emulator has booted |
| `GET /tasks` | Every task: `id`, `description`, `metadata` |
| `GET /tasks/by-tag/{tag}` | Curated list; `all` plus `?app=` / `?max_instances=` |
| `GET /task/{task_id}` | One task's description, without resetting |
| `POST /session/reset` | `{"task_id": ...}` → resets the app to the task's initial state |
| `POST /session/verify` | `{"answer": ...}` → `{"completed", "score", "metrics"}` |
| `POST /session/persist` | Snapshot app state without verifying |
| `POST /device/command` | `{"command": "input tap 500 300"}` → runs `adb shell <command>` |
| `GET /device/screenshot` | PNG bytes (`?format=jpeg&quality=80` for JPEG) |
| `GET /device/resolution` | `{"width": ..., "height": ...}` |

```bash
curl -s http://localhost:6800/tasks | head -c 400
curl -s -X POST http://localhost:6800/session/reset \
     -H 'Content-Type: application/json' \
     -d '{"task_id": "banking__check_account_balance__checking_primary_checking_0"}'
curl -s -o shot.png http://localhost:6800/device/screenshot
```

## 6. Environment variables

| Variable | Default | Description |
|---|---|---|
| `ENABLE_VNC` | `false` | Start the noVNC stack on port 5800 |
| `GPU_MODE` | `swiftshader_indirect` | Emulator GPU mode; `off` uses guest software rendering |
| `EMULATOR_TIMEOUT` | `600` | Seconds to wait for the emulator to boot |
| `EMULATOR_MEMORY_MB` | `4096` | Emulator RAM. Changing it away from the AVD's own `hw.ramSize` stops the baked snapshot restoring, so the container cold-boots and re-installs the apps |
| `EMULATOR_CORES` | `4` | Emulator vCPUs; same caveat as above |
| `SERVER_PORT` | `6800` | Control server port *inside* the container. Map a different host port with `-p` instead of changing this — `EXPOSE`, the harness and the health check all assume 6800 |

`AVD_NAME` and `SNAPSHOT_NAME` are also read at start-up, but the image only
contains the one AVD and the one snapshot that the build created; they exist so
the build can name them, not as runtime knobs.

### Reset behaviour

A reset only works against a running app, and back-to-back resets are where
that assumption breaks: the previous episode's app is still shutting down when
the next one relaunches it, the `set`/`append` deeplink lands on a process that
is not listening yet, and the reset fails with `Failed to pull database…`.
`POST /session/reset` therefore relaunches the app, waits for the process, and
retries the whole reset before reporting failure.

| Variable | Default | Description |
|---|---|---|
| `DIGIWORLD_RESET_ATTEMPTS` | `3` | Reset attempts per request, each preceded by a relaunch |
| `DIGIWORLD_RESET_BUDGET` | `240` | Seconds across all attempts; no new attempt starts past this |
| `DIGIWORLD_APP_LAUNCH_TIMEOUT` | `30` | Seconds to wait for the relaunched process to appear |
| `DIGIWORLD_APP_LAUNCH_SETTLE` | `3` | Grace period for the JS bundle to mount once the process exists |
| `DIGIWORLD_PULL_TIMEOUT` | `45` | Wall-clock budget for one file pull off the device, retries included |
| `DIGIWORLD_SKIP_ASSET_SYNC` | unset | Skip the per-profile image push on reset (see below) |

Keep the harness's `session_timeout` (default 300) above `DIGIWORLD_RESET_BUDGET`,
or the client abandons a reset that is still running and reports a read timeout
instead of the real error.

### Profile assets

Images are addressed by record id (`assets/menu/<item_id>.png`,
`assets/songs/<song_id>/main.jpg`, …) and every profile has its own id set, so
they have to match the profile whose mockdata is on the device. The build bakes
one profile per app — a random one, unless `INIT_APPS_RANDOM_PROFILES=false` —
while an evaluation selects its own profile per task. Each reset therefore
re-pushes images when the profile on the device differs from the one it needs,
guarded by a device-side marker so it is a no-op the rest of the time.

That costs one asset transfer per app the first time a container runs a task on
a profile other than the baked one. Build with
`--build-arg`/`-e INIT_APPS_RANDOM_PROFILES=false` to bake `default` instead and
avoid it, or set `DIGIWORLD_SKIP_ASSET_SYNC=true` to accept mismatched images.

## 7. What is in the image

```
/app
├── digiworld/            digiworld package + state_data (scenarios, mock data)
├── digiworld_eval/       control server (local_server.py)
├── apps/<app>/app.json   deeplink definitions
├── apks/                 the 15 mock app APKs
└── docker/               entrypoint and emulator scripts
/opt/android              Android SDK: platform-tools, system image, emulator
/root/.android/avd        the AVD and its baked snapshot
```

On start-up the entrypoint launches the control server (so `/health` answers
immediately), boots the emulator from the snapshot, and confirms the apps are
present — re-provisioning them if the snapshot turned out not to contain them.

## 8. Troubleshooting

**`/dev/kvm is not available inside the container`**
Pass `--device /dev/kvm`, and check `ls -l /dev/kvm` on the host. Inside a VM,
nested virtualisation has to be enabled.

**`/dev/kvm: permission denied` under rootless Podman**
Podman does not carry your host group memberships into the container, so being
in the `kvm` group on the host is not enough when `/dev/kvm` is `0660`. Add
`--group-add keep-groups` to the run (`container_extra_args` in the eval
config), or use Docker / rootful Podman.

**Build fails at `COPY digiworld/current_apps/`**
The APKs are missing. `build.sh` checks for them up front; run it rather than
`docker build` directly.

**Build fails with "state data … is still a set of Git LFS pointers"**
Run `git lfs install && git lfs pull` from the repository root.

**`/health` stays `{"ok": false}`**
The emulator is still booting or has failed. `docker logs <container>` shows the
boot progress, and `docker exec <container> tail -50 /var/log/emulator.log` shows
why it stopped. On hosts without KVM the boot simply never completes.

**Every task for one app fails to reset with `Incompatible app version`**
That app's APK is older than the minimum in `digiworld/apk_versions.json`. The
build prints an `APK OUT OF DATE` warning for each one; replace the APK in
`digiworld/current_apps/` and rebuild. (The same check applies to the local
setup — it is a property of the APK, not of the container.)

**Every task for one app fails to reset**
That app's data was not initialised. Check which apps are installed with
`docker exec <container> adb shell pm list packages | grep andojo` — 15 packages
are expected. If one is missing, or if the container log shows
`did not initialise`, rebuild: `./docker/build.sh -- --no-cache`.
(If *all* apps are missing the snapshot did not restore; the entrypoint detects
that and re-provisions on start-up, which shows up as a much slower boot.)

**Emulator boots but the screen is black**
Try `-e GPU_MODE=off`, which switches from host-side software rendering to
guest-side.

**`podman: command not found` / `docker: command not found`**
Set `container_runtime` in the config (or `CONTAINER_RUNTIME` for the build) to
the one you have installed.
