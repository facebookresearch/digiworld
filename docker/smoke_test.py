# Copyright (c) Meta Platforms, Inc. and affiliates.
"""End-to-end check of a running DigiWorld container.

Exercises every endpoint the evaluation harness uses -- health, task listing,
scenario reset, screenshot, action dispatch and verification -- so a failure
here points at the container rather than at the model or the harness.

    python3 docker/smoke_test.py                          # http://localhost:6800
    python3 docker/smoke_test.py --url http://localhost:6801
    python3 docker/smoke_test.py --task banking__check_initial_deposit__money_market_0

Only the standard library is used, so it can be run from any Python 3.9+
interpreter without installing anything.
"""

from __future__ import annotations

import argparse
import json
import socket
import sys
import time
import urllib.error
import urllib.request

# Must outlast the server's reset budget (DIGIWORLD_RESET_BUDGET, 240s), which
# covers up to three relaunch-and-retry attempts. Below it, the smoke test
# reports a timeout on a reset that is still running and would have passed.
TIMEOUT = 300


class SmokeTestError(Exception):
    pass


def _request(url: str, method: str = "GET", payload: dict | None = None, timeout: int = TIMEOUT):
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            body = resp.read()
            content_type = resp.headers.get("Content-Type", "")
    except urllib.error.HTTPError as exc:
        raise SmokeTestError(f"{method} {url} -> HTTP {exc.code}: {exc.read()[:400]!r}") from None
    except urllib.error.URLError as exc:
        raise SmokeTestError(f"{method} {url} -> {exc.reason}") from None
    except (TimeoutError, socket.timeout) as exc:
        # urllib raises the socket timeout directly once the connection is up.
        raise SmokeTestError(f"{method} {url} -> timed out after {timeout}s ({exc})") from None
    except OSError as exc:
        raise SmokeTestError(f"{method} {url} -> {exc}") from None

    if content_type.startswith("application/json"):
        return json.loads(body)
    return body


def wait_for_ready(base: str, timeout: float) -> dict:
    deadline = time.time() + timeout
    last = "no response"
    while time.time() < deadline:
        try:
            health = _request(f"{base}/health", timeout=15)
            if health.get("ok"):
                return health
            last = str(health.get("status", health))
        except SmokeTestError as exc:
            last = str(exc)
        print(f"    waiting for the emulator ({last})...")
        time.sleep(5)
    raise SmokeTestError(f"container never became ready ({last})")


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke-test a DigiWorld container")
    parser.add_argument("--url", default="http://localhost:6800", help="Container base URL")
    parser.add_argument("--task", default=None, help="Task id to reset to (default: the first one listed)")
    parser.add_argument("--timeout", type=float, default=600, help="Seconds to wait for the emulator")
    parser.add_argument("--screenshot", default=None, help="Write the screenshot to this path")
    args = parser.parse_args()

    base = args.url.rstrip("/")
    print(f"==> DigiWorld container smoke test against {base}")

    print("[1/7] /health")
    health = wait_for_ready(base, args.timeout)
    print(f"      ok, {health.get('tasks')} tasks registered")
    if not health.get("tasks"):
        raise SmokeTestError(
            "the server reports 0 tasks -- the digiworld package or its state data "
            "is missing from the image"
        )

    print("[2/7] /tasks")
    tasks = _request(f"{base}/tasks")
    if not isinstance(tasks, list) or not tasks:
        raise SmokeTestError(f"expected a non-empty task list, got {tasks!r}")
    print(f"      {len(tasks)} tasks, e.g. {tasks[0]['id']}")

    task_id = args.task or tasks[0]["id"]

    print(f"[3/7] /session/reset  ({task_id})")
    reset = _request(f"{base}/session/reset", method="POST", payload={"task_id": task_id})
    description = reset.get("task_description", "")
    if not description:
        raise SmokeTestError(f"reset returned no task_description: {reset!r}")
    print(f"      goal: {description[:100]}")
    print(f"      profile={reset.get('metadata', {}).get('profile')} "
          f"instance={reset.get('metadata', {}).get('instance')}")

    print("[4/7] /device/resolution")
    resolution = _request(f"{base}/device/resolution")
    width, height = resolution.get("width"), resolution.get("height")
    if not width or not height:
        raise SmokeTestError(f"bad resolution response: {resolution!r}")
    print(f"      {width}x{height}")

    print("[5/7] /device/screenshot")
    png = _request(f"{base}/device/screenshot")
    if not isinstance(png, bytes) or not png.startswith(b"\x89PNG"):
        raise SmokeTestError(f"expected PNG bytes, got {type(png).__name__} ({len(png)} bytes)")
    print(f"      {len(png)} bytes")
    if args.screenshot:
        with open(args.screenshot, "wb") as handle:
            handle.write(png)
        print(f"      saved to {args.screenshot}")

    print("[6/7] /device/command")
    command = _request(
        f"{base}/device/command", method="POST",
        payload={"command": f"input tap {width // 2} {height // 2}"},
    )
    if command.get("returncode") != 0:
        raise SmokeTestError(f"tap failed: {command!r}")
    print("      tap dispatched")

    print("[7/7] /session/verify")
    verify = _request(f"{base}/session/verify", method="POST", payload={"answer": None})
    if "completed" not in verify or "score" not in verify:
        raise SmokeTestError(f"malformed verify response: {verify!r}")
    metrics = verify.get("metrics", {})
    if metrics.get("error"):
        raise SmokeTestError(f"verification could not run: {metrics['error']}")
    # A random tap is not expected to solve the task; what matters is that the
    # verifier ran and produced a verdict.
    print(f"      completed={verify['completed']} score={verify['score']}")

    print("\n==> All checks passed.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except SmokeTestError as error:
        print(f"\nFAILED: {error}", file=sys.stderr)
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterrupted.", file=sys.stderr)
        sys.exit(130)
    except Exception as error:  # noqa: BLE001 - a traceback helps nobody here
        print(f"\nFAILED: unexpected {type(error).__name__}: {error}", file=sys.stderr)
        sys.exit(1)
