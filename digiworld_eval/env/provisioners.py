# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Provision DigiWorld servers as local Docker/Podman containers.

Each container runs its own Android emulator plus the DigiWorld control server
(see docker/README.md), so one container == one evaluation worker.
"""

import atexit
import concurrent.futures
import json
import logging
import os
import shutil
import signal
import socket
import subprocess
import threading
import time
import uuid

import requests

logger = logging.getLogger(__name__)

CONTAINER_PORT: int = 6800
CONTAINER_READY_TIMEOUT_S: float = 600
POLL_INTERVAL_S: float = 5
# `run -d` returns as soon as the container is created, but the runtime may
# still have to pull a multi-gigabyte image first.
RUN_TIMEOUT_S: float = 900
START_RETRIES: int = 3
# Marks containers we started, so they can be found and cleaned up later.
CONTAINER_LABEL: str = "digiworld-eval"


# ---------------------------------------------------------------------------
# Local container provisioner (docker / podman)
# ---------------------------------------------------------------------------


class ContainerProvisioner:
    """Provisions DigiWorld servers as local containers via Docker or Podman."""

    def __init__(
        self,
        image: str,
        runtime: str | None = None,
        container_env: dict[str, str] | None = None,
        extra_args: list[str] | None = None,
        device_kvm: bool = True,
        publish_host: str = "127.0.0.1",
        ready_timeout: float = CONTAINER_READY_TIMEOUT_S,
    ) -> None:
        self.runtime = detect_runtime(runtime)
        self.image = image
        self.container_env = container_env or {}
        self.extra_args = extra_args or []
        self.device_kvm = device_kvm
        self.publish_host = publish_host
        self.ready_timeout = ready_timeout
        self._container_ids: list[str] = []
        self._urls: list[str] = []
        self._atexit_registered = False
        self._lock = threading.Lock()

    def _run_args(self, name: str, local_port: int) -> list[str]:
        cmd = [
            self.runtime, "run", "-d",
            "--name", name,
            "--label", f"{CONTAINER_LABEL}=true",
            # Bound to the loopback interface on purpose: /device/command runs
            # arbitrary adb shell commands, so the API must not be reachable
            # from the network.
            "-p", f"{self.publish_host}:{local_port}:{CONTAINER_PORT}",
        ]
        if self.device_kvm:
            cmd += ["--device", "/dev/kvm"]
        for k, v in self.container_env.items():
            cmd += ["-e", f"{k}={v}"]
        cmd += self.extra_args
        cmd.append(self.image)
        return cmd

    def _start_one(self, idx: int, count: int) -> tuple[str, str]:
        last_error = ""
        for attempt in range(START_RETRIES):
            local_port = _find_free_port()
            name = f"digiworld-{uuid.uuid4().hex[:10]}"

            logger.info(
                "Starting container %d/%d as %s on port %d", idx + 1, count, name, local_port
            )
            try:
                result = subprocess.run(
                    self._run_args(name, local_port),
                    capture_output=True, text=True, timeout=RUN_TIMEOUT_S,
                )
            except subprocess.TimeoutExpired:
                # The runtime may still have created the container before we
                # gave up on it.
                self._force_remove(name)
                raise RuntimeError(
                    f"{self.runtime} run did not return within {RUN_TIMEOUT_S:.0f}s "
                    f"(pulling {self.image}?)"
                ) from None

            if result.returncode == 0:
                # Record before waiting for health so that teardown still
                # removes the container if it never becomes ready.
                self._register(name)
                url = f"http://{self.publish_host}:{local_port}"
                _wait_for_health(url, name, self.ready_timeout)
                return name, url

            # A failed `run` can still leave a created container behind.
            self._force_remove(name)
            last_error = (result.stderr or result.stdout).strip()
            # Another process may have taken the port between the probe and
            # the bind; that is worth one more roll of the dice.
            if "port is already allocated" in last_error or "address already in use" in last_error:
                logger.warning("Port %d was taken, retrying (%d/%d)", local_port, attempt + 1, START_RETRIES)
                continue
            break

        raise RuntimeError(f"{self.runtime} run failed: {last_error}")

    def _force_remove(self, name: str) -> None:
        try:
            subprocess.run([self.runtime, "rm", "-f", name], capture_output=True, timeout=60)
        except Exception:
            logger.debug("Could not remove container %s", name, exc_info=True)

    def _register(self, container: str) -> None:
        with self._lock:
            self._container_ids.append(container)
            if self._atexit_registered:
                return
            self._atexit_registered = True
        # ServerEnv.teardown() is not always reached (the harness relies on
        # __del__), and a leaked container keeps an emulator and its RAM alive
        # indefinitely. atexit covers a normal exit; SIGTERM (the usual way a
        # scheduler stops a run) does not raise, so it needs its own handler.
        atexit.register(self.teardown)
        self._install_sigterm_handler()

    def _install_sigterm_handler(self) -> None:
        if threading.current_thread() is not threading.main_thread():
            return
        try:
            previous = signal.getsignal(signal.SIGTERM)
        except (ValueError, OSError):
            return

        def _on_sigterm(signum, frame):
            self.teardown()
            if callable(previous) and previous not in (signal.SIG_IGN, signal.SIG_DFL):
                previous(signum, frame)
            else:
                signal.signal(signal.SIGTERM, signal.SIG_DFL)
                os.kill(os.getpid(), signum)

        try:
            signal.signal(signal.SIGTERM, _on_sigterm)
        except (ValueError, OSError):
            logger.debug("Could not install SIGTERM handler", exc_info=True)

    def provision(self, count: int) -> list[str]:
        if count < 1:
            raise ValueError(f"container_count must be >= 1, got {count}")
        if self.device_kvm and not os.path.exists("/dev/kvm"):
            raise RuntimeError(
                "/dev/kvm is not available, so the DigiWorld emulator cannot run. "
                "Use a Linux host with KVM enabled and make sure your user can "
                "access /dev/kvm, or set container_device_kvm: false if your image "
                "does not need it."
            )
        return _provision_parallel(count, self._start_one, self._urls)

    def teardown(self) -> None:
        with self._lock:
            containers = self._container_ids
            self._container_ids = []
            self._urls = []
        if not containers:
            return
        for cid in containers:
            self._force_remove(cid)
        logger.info("Removed %d containers", len(containers))


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def detect_runtime(runtime: str | None = None) -> str:
    """Return the container runtime to use, checking that it actually works.

    Falls back to the CONTAINER_RUNTIME environment variable (the same one
    docker/build.sh honours) before auto-detecting.
    """
    requested = runtime or os.environ.get("CONTAINER_RUNTIME") or None
    if requested is not None:
        if requested not in ("docker", "podman"):
            raise ValueError(f"runtime must be 'docker' or 'podman', got {requested!r}")
        if shutil.which(requested) is None:
            raise RuntimeError(f"container_runtime is {requested!r} but {requested} is not on PATH")
        return requested

    # Having the client on PATH says nothing about the daemon being up, and a
    # docker CLI with no daemon is a common way to end up with neither.
    installed = [c for c in ("docker", "podman") if shutil.which(c) is not None]
    if not installed:
        raise RuntimeError("Neither docker nor podman was found on PATH")
    for candidate in installed:
        try:
            probe = subprocess.run(
                [candidate, "ps", "-q"], capture_output=True, text=True, timeout=30
            )
        except (OSError, subprocess.TimeoutExpired):
            continue
        if probe.returncode == 0:
            return candidate
        logger.debug("%s is installed but not usable: %s", candidate, probe.stderr.strip())
    raise RuntimeError(
        f"Found {' and '.join(installed)} on PATH but none of them are usable "
        "(is the daemon running?)"
    )


def _labelled_containers(rt: str, include_stopped: bool) -> list[str]:
    cmd = [rt, "ps"]
    if include_stopped:
        cmd.append("-a")
    cmd += ["--filter", f"label={CONTAINER_LABEL}=true", "--format", "{{.Names}}"]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)} failed: {result.stderr.strip()}")
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def list_containers(runtime: str | None = None) -> list[str]:
    """Names of the DigiWorld containers currently running on this host."""
    return _labelled_containers(detect_runtime(runtime), include_stopped=False)


def remove_all_containers(runtime: str | None = None) -> int:
    """Force-remove every DigiWorld container on this host. Returns the count."""
    rt = detect_runtime(runtime)
    removed = 0
    for name in _labelled_containers(rt, include_stopped=True):
        result = subprocess.run([rt, "rm", "-f", name], capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            removed += 1
        else:
            logger.warning("Failed to remove container %s: %s", name, result.stderr.strip())
    return removed


def _find_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def _wait_for_health(url: str, label: str, timeout: float) -> None:
    """Block until the container reports a booted emulator.

    /health answers 200 with ``{"ok": false, "status": "not_ready"}`` for the
    minutes it takes the emulator to boot, so the status code alone is not a
    readiness signal.
    """
    deadline = time.time() + timeout
    last_status = "no response"
    while time.time() < deadline:
        try:
            resp = requests.get(f"{url}/health", timeout=10)
            if resp.status_code == 200:
                body = resp.json()
                if body.get("ok"):
                    logger.info(
                        "Container %s ready at %s (%s tasks)", label, url, body.get("tasks", "?")
                    )
                    return
                last_status = str(body.get("status", body))
            else:
                last_status = f"HTTP {resp.status_code}"
        except (requests.ConnectionError, requests.Timeout):
            last_status = "connection refused"
        except (ValueError, json.JSONDecodeError):
            last_status = "malformed /health response"
        time.sleep(POLL_INTERVAL_S)
    raise RuntimeError(
        f"Container {label} was not ready at {url} after {timeout:.0f}s (last status: {last_status})"
    )


def _provision_parallel(count: int, start_fn, urls: list[str]) -> list[str]:
    failed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=min(count, 8)) as pool:
        futures = [pool.submit(start_fn, i, count) for i in range(count)]
        for future in concurrent.futures.as_completed(futures):
            try:
                _cid, url = future.result()
                urls.append(url)
            except Exception as exc:
                failed += 1
                logger.warning("Container provisioning failed: %s", exc)
    if not urls:
        raise RuntimeError(f"All {count} containers failed to provision")
    if failed:
        logger.warning("Provisioned %d/%d containers (%d failed)", len(urls), count, failed)
    return list(urls)
