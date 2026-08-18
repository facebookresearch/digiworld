# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Lightweight local bridge server for DigiWorld evaluation.

Wraps an Android emulator (via ADB) behind the HTTP API that `server_env`
speaks. It is used in both supported setups:

    - locally, next to an Android Studio emulator, with no container involved
    - inside the DigiWorld container image, next to the emulator it ships
      (see docker/README.md)

Prerequisites:
    - Android Studio emulator running (or any ADB-visible device)
    - `adb` on PATH
    - pip install fastapi uvicorn pillow
    - Optional: `digiworld` package installed for scenario reset/verify

Usage:
    # Minimal (device primitives only — reset/verify return stubs):
    python -m digiworld_eval.local_server

    # With digiworld scenarios (full reset/verify):
    python -m digiworld_eval.local_server --digiworld

    # Target a specific emulator:
    python -m digiworld_eval.local_server --device emulator-5554

    # Custom port:
    python -m digiworld_eval.local_server --port 6800

Note that /device/command executes arbitrary adb shell commands, so the server
should only ever be reachable from trusted hosts.
"""

import argparse
import io
import logging
import os
import subprocess
import sys
import time
import traceback
from typing import Any, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel
from PIL import Image

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# ADB helper
# ---------------------------------------------------------------------------

_DEVICE_SERIAL: Optional[str] = None


def _adb(*args: str, timeout: int = 30) -> subprocess.CompletedProcess:
    cmd = ["adb"]
    if _DEVICE_SERIAL:
        cmd += ["-s", _DEVICE_SERIAL]
    cmd += list(args)
    return subprocess.run(cmd, capture_output=True, timeout=timeout)


def _adb_shell(command: str, timeout: int = 30) -> subprocess.CompletedProcess:
    cmd = ["adb"]
    if _DEVICE_SERIAL:
        cmd += ["-s", _DEVICE_SERIAL]
    cmd += ["shell", command]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)


# ---------------------------------------------------------------------------
# App relaunch
#
# A reset only works against a live app: every step of it (the mockdata push,
# the `set` deeplink, the db-forge round trip) is answered by the running
# process. Back-to-back resets are where this bites -- the previous episode's
# app is still shutting down when the next one force-stops and relaunches it.
# ---------------------------------------------------------------------------

# Attempts at reset_initial_state() per request, each preceded by a relaunch.
_RESET_ATTEMPTS = int(os.environ.get("DIGIWORLD_RESET_ATTEMPTS", "3"))
# Wall clock across all attempts. No new attempt starts past this, so the
# server always answers before the client's own timeout and the caller gets a
# real error instead of a read timeout on a request that is still running.
_RESET_BUDGET_SECONDS = float(os.environ.get("DIGIWORLD_RESET_BUDGET", "240"))
# How long to wait for the relaunched process to appear before giving up on it.
_APP_LAUNCH_TIMEOUT = float(os.environ.get("DIGIWORLD_APP_LAUNCH_TIMEOUT", "30"))
# Grace period for the JS bundle to mount after the process exists. The app
# rewrites its readiness file only once it has, and that file survives a
# force-stop, so polling it cannot distinguish "ready" from "not yet restarted".
_APP_LAUNCH_SETTLE = float(os.environ.get("DIGIWORLD_APP_LAUNCH_SETTLE", "3"))


def _app_is_running(bundle_id: str) -> Optional[bool]:
    """Whether *bundle_id* has a live process, or ``None`` if we cannot tell.

    ``pidof`` ships with toybox on every supported image, but if it is ever
    missing we must say so rather than report "not running" forever -- that
    would turn each poll into a full timeout.
    """
    result = _adb_shell(f"pidof {bundle_id}", timeout=15)
    if result.returncode not in (0, 1) or "not found" in (result.stderr or ""):
        return None
    return bool(result.stdout.strip())


def _relaunch_app(bundle_id: str) -> bool:
    """Force-stop *bundle_id* and bring it back up.

    Returns:
        ``True`` once the process is up, ``False`` if it never appeared.
    """
    _adb_shell(f"am force-stop {bundle_id}")

    if _app_is_running(bundle_id) is None:
        # No usable process check -- fall back to launching blind and waiting.
        logger.warning("pidof unavailable; falling back to a fixed launch wait")
        _adb_shell(f"monkey -p {bundle_id} -c android.intent.category.LAUNCHER 1")
        time.sleep(_APP_LAUNCH_SETTLE + 2)
        return True

    # Wait for the process to actually be gone; relaunching into a teardown
    # races the framework and can leave the app in a half-started state.
    deadline = time.monotonic() + 10
    while _app_is_running(bundle_id) and time.monotonic() < deadline:
        time.sleep(0.5)

    _adb_shell(f"monkey -p {bundle_id} -c android.intent.category.LAUNCHER 1")

    deadline = time.monotonic() + _APP_LAUNCH_TIMEOUT
    while time.monotonic() < deadline:
        if _app_is_running(bundle_id):
            time.sleep(_APP_LAUNCH_SETTLE)
            return True
        time.sleep(0.5)

    logger.warning("%s did not start within %.0fs", bundle_id, _APP_LAUNCH_TIMEOUT)
    return False


# ---------------------------------------------------------------------------
# Optional digiworld integration
# ---------------------------------------------------------------------------

_session_manager: Any = None


def _init_digiworld() -> bool:
    global _session_manager
    try:
        import digiworld
        from digiworld.app_registry import get_app_to_bundle_mapping
        from digiworld.scenarios.scenario_registry import ScenarioRegistry

        class _SessionManager:
            def __init__(self):
                self.registry = ScenarioRegistry()
                self.base_path = digiworld.get_state_data_path()
                self.bundles = get_app_to_bundle_mapping()
                self.scenario_object = None
                self.current_task_id: Optional[str] = None

        _session_manager = _SessionManager()
        n_scenarios = len(_session_manager.registry.get_scenario_list())
        n_instances = len(_session_manager.registry.get_instance_list())
        logger.info(
            "digiworld loaded: %d scenarios, %d instances, state_data=%s",
            n_scenarios, n_instances, _session_manager.base_path,
        )
        return True
    except ImportError:
        logger.warning("digiworld package not found — /session/reset and /session/verify will return stubs")
        return False
    except Exception:
        logger.error("Failed to initialize digiworld:\n%s", traceback.format_exc())
        return False


def _parse_task_id(task_id: str):
    parts = task_id.split("__", 2)
    if len(parts) == 3:
        app_name, dir_name, instance_name = parts
    elif len(parts) == 2:
        app_name, dir_name = parts
        instance_name = None
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid task_id format. Expected 'app__task_dir[__instance]', got: {task_id}",
        )

    task_template = _session_manager.registry.get_task_template(app_name, dir_name)
    return app_name, task_template, instance_name


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(title="DigiWorld Local Bridge Server", version="1.0.0")

# Curated task lists exposed through /tasks/by-tag.
_TAGS = {"all": "Every registered scenario instance"}


# -- Request/Response models --

class ResetRequest(BaseModel):
    task_id: str


class VerifyRequest(BaseModel):
    answer: Optional[str] = None


class CommandRequest(BaseModel):
    command: str
    timeout: int = 30


class CommandResponse(BaseModel):
    stdout: str
    stderr: str
    returncode: int


# -- Task primitives --

@app.get("/tasks")
def list_tasks():
    if _session_manager is None:
        return []

    tasks = []
    for app_name, task_name, instance_name in _session_manager.registry.get_instance_list():
        dir_name = _session_manager.registry.get_dir_name(app_name, task_name)
        task_id = f"{app_name}__{dir_name}__{instance_name}"
        tasks.append({
            "id": task_id,
            "description": task_name,
            "metadata": {"app_name": app_name, "instance_name": instance_name},
        })
    tasks.sort(key=lambda t: t["id"])
    return tasks


@app.get("/tags")
def list_tags():
    return [{"tag": name, "description": desc} for name, desc in _TAGS.items()]


@app.get("/tasks/by-tag/{tag}")
def list_tasks_by_tag(
    tag: str,
    app_name: Optional[str] = Query(None, alias="app"),
    max_instances: Optional[int] = None,
):
    """Curated task lists, used by the `task_query` config path.

    `all` is the only built-in tag; narrow it down with the `app` and
    `max_instances` query parameters (e.g. ?app=banking&max_instances=3).
    """
    if tag not in _TAGS:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown tag: {tag}. Available tags: {list(_TAGS)}",
        )

    tasks = list_tasks()
    if app_name is not None:
        tasks = [t for t in tasks if t["metadata"]["app_name"] == app_name]
    if max_instances is not None:
        kept: list[dict] = []
        per_scenario: dict[str, int] = {}
        for task in tasks:
            # task ids are "<app>__<scenario>__<instance>"; cap per scenario.
            scenario = "__".join(task["id"].split("__")[:2])
            if per_scenario.get(scenario, 0) < max_instances:
                kept.append(task)
                per_scenario[scenario] = per_scenario.get(scenario, 0) + 1
        tasks = kept
    return tasks


@app.get("/task/{task_id}")
def get_task(task_id: str):
    """Task description and metadata, without touching the emulator."""
    if _session_manager is None:
        raise HTTPException(status_code=503, detail="digiworld scenarios are not loaded")

    app_name, task_name, instance_name = _parse_task_id(task_id)
    try:
        scenario_obj = _session_manager.registry.get_scenario(
            app_name, task_name,
            base_path=_session_manager.base_path,
            instance_tag=instance_name,
        )
    except Exception:
        logger.error("Failed to load scenario:\n%s", traceback.format_exc())
        raise HTTPException(status_code=404, detail=f"Task not found: {task_id}")

    return {
        "id": task_id,
        "description": scenario_obj.get_task_description(),
        "metadata": {
            "app_name": app_name,
            "instance_name": instance_name,
            "bundle_id": _session_manager.bundles.get(app_name, ""),
        },
    }


@app.post("/session/reset")
def reset_session(request: ResetRequest):
    if _session_manager is None:
        return {
            "task_description": f"[stub] Task {request.task_id}",
            "context": "",
            "metadata": {"task_id": request.task_id},
        }

    try:
        app_name, task_name, instance_name = _parse_task_id(request.task_id)
    except Exception:
        raise HTTPException(status_code=400, detail=f"Failed to parse task_id: {request.task_id}")

    try:
        from digiworld.adb.backends import ADBBackend
        backend = ADBBackend(device_serial=_DEVICE_SERIAL)

        scenario_obj = _session_manager.registry.get_scenario(
            app_name, task_name,
            base_path=_session_manager.base_path,
            instance_tag=instance_name,
            backend=backend,
        )
    except Exception:
        logger.error("Failed to load scenario:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to load scenario for {request.task_id}")

    bundle_id = _session_manager.bundles.get(app_name)

    # A reset fails almost exclusively because the app was not up yet when the
    # first deeplink reached it, which a relaunch and a second go fixes. Losing
    # the task instead costs the whole episode, so retry here rather than
    # letting the eval requeue it.
    deadline = time.monotonic() + _RESET_BUDGET_SECONDS
    last_error = None
    reset_ok = False
    attempt = 0
    while attempt < _RESET_ATTEMPTS:
        attempt += 1
        if bundle_id:
            _relaunch_app(bundle_id)

        try:
            scenario_obj.reset_initial_state()
            reset_ok = True
            break
        except Exception as exc:
            last_error = exc
            logger.error(
                "reset_initial_state() failed (attempt %d/%d):\n%s",
                attempt, _RESET_ATTEMPTS, traceback.format_exc(),
            )
            if time.monotonic() >= deadline:
                logger.error(
                    "Reset budget of %.0fs exhausted after %d attempt(s)",
                    _RESET_BUDGET_SECONDS, attempt,
                )
                break

    if not reset_ok:
        raise HTTPException(
            status_code=500,
            detail=(
                f"Failed to reset state for {request.task_id} after "
                f"{attempt} attempt(s): {last_error}"
            ),
        )

    _session_manager.scenario_object = scenario_obj
    _session_manager.current_task_id = request.task_id

    task_description = scenario_obj.get_task_description()
    context = ""
    if hasattr(scenario_obj, "format_context_for_system_prompt"):
        db_path = None
        if hasattr(scenario_obj, "initial_state_path") and scenario_obj.initial_state_path:
            db_path = os.path.join(
                scenario_obj.initial_state_path,
                f"{scenario_obj.initial_state_id}.db",
            )
        context = scenario_obj.format_context_for_system_prompt(db_path)

    return {
        "task_description": task_description,
        "context": context,
        "metadata": {
            "task_id": request.task_id,
            # `instance`, `theme` and `ui_state` are recorded per episode by
            # ServerEnv, so report whatever the scenario actually selected
            # rather than only what the task id asked for.
            "instance": getattr(scenario_obj, "instance_tag", instance_name),
            "profile": getattr(scenario_obj, "profile_name", "unknown"),
            "theme": getattr(scenario_obj, "theme_name", None),
            "ui_state": getattr(scenario_obj, "ui_state_name", None),
            "initial_state_id": getattr(scenario_obj, "initial_state_id", ""),
            "app_name": app_name,
            "instance_name": instance_name,
        },
    }


@app.post("/session/verify")
def verify_session(request: VerifyRequest):
    if _session_manager is None or _session_manager.scenario_object is None:
        return {"completed": False, "score": 0.0, "metrics": {"error": "no_active_session"}}

    scenario = _session_manager.scenario_object

    if request.answer is not None and hasattr(scenario, "agent_answer"):
        scenario.agent_answer = request.answer

    try:
        session_id = scenario.adb.persist_state()
        trajectory = [scenario.initial_state_id, session_id]
    except Exception:
        logger.error("persist_state() failed:\n%s", traceback.format_exc())
        return {"completed": False, "score": 0.0, "metrics": {"error": "state_persistence_failed"}}

    try:
        metrics = scenario.verify_trajectory(trajectory)
    except Exception:
        logger.error("verify_trajectory() failed:\n%s", traceback.format_exc())
        return {"completed": False, "score": 0.0, "metrics": {"error": "verification_failed"}}

    task_completed = metrics.get("task_completed", 0.0)
    return {
        "completed": task_completed == 1.0,
        "score": task_completed,
        "metrics": metrics,
    }


@app.post("/session/persist")
def persist_session():
    """Snapshot the current app state without verifying it."""
    if _session_manager is None or _session_manager.scenario_object is None:
        raise HTTPException(status_code=400, detail="No active session. Call POST /session/reset first.")
    try:
        session_id = _session_manager.scenario_object.adb.persist_state()
    except Exception:
        logger.error("persist_state() failed:\n%s", traceback.format_exc())
        raise HTTPException(status_code=500, detail="Failed to persist state")
    return {"success": True, "session_id": session_id}


# -- Device primitives --

@app.post("/device/command", response_model=CommandResponse)
def device_command(request: CommandRequest):
    try:
        result = _adb_shell(request.command, timeout=request.timeout)
        return CommandResponse(
            stdout=result.stdout,
            stderr=result.stderr,
            returncode=result.returncode,
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail=f"Command timed out after {request.timeout}s")


@app.get("/device/screenshot")
def device_screenshot(format: str = "png", quality: int = 85):
    try:
        result = _adb("exec-out", "screencap", "-p", timeout=15)
        if result.returncode != 0:
            raise HTTPException(
                status_code=500,
                detail=f"screencap failed: {result.stderr.decode(errors='replace')}",
            )
        png_bytes = result.stdout
        if not png_bytes:
            raise HTTPException(status_code=500, detail="screencap returned empty output")

        if format.lower() == "png":
            return Response(content=png_bytes, media_type="image/png")

        img = Image.open(io.BytesIO(png_bytes))
        buffer = io.BytesIO()
        if format.lower() in ("jpg", "jpeg"):
            if img.mode == "RGBA":
                img = img.convert("RGB")
            img.save(buffer, format="JPEG", quality=quality)
            return Response(content=buffer.getvalue(), media_type="image/jpeg")

        return Response(content=png_bytes, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/device/resolution")
def device_resolution():
    try:
        result = _adb_shell("wm size")
        for line in result.stdout.strip().splitlines():
            if "Physical size" in line or "Override size" in line:
                size_str = line.split(":")[-1].strip()
                width, height = size_str.split("x")
                return {"width": int(width), "height": int(height)}
        raise HTTPException(status_code=500, detail=f"Could not parse resolution from: {result.stdout}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
def health():
    emulator_ok = False
    try:
        result = _adb_shell("getprop sys.boot_completed", timeout=5)
        emulator_ok = result.stdout.strip() == "1"
    except Exception:
        pass

    # A booted emulator is not necessarily a usable one. In the container the
    # entrypoint still has to grant root, set SELinux permissive, disable
    # animations and -- if the image was built without a baked snapshot --
    # install the apps, all of which happen after sys.boot_completed flips to 1.
    # It touches DIGIWORLD_READY_FILE once that is done; the local setup does
    # not set the variable and is unaffected.
    ready_file = os.environ.get("DIGIWORLD_READY_FILE")
    if ready_file and not os.path.exists(ready_file):
        emulator_ok = False

    task_count = 0
    if _session_manager:
        task_count = len(_session_manager.registry.get_instance_list())

    return {
        "ok": emulator_ok,
        "status": "running" if emulator_ok else "not_ready",
        "tasks": task_count,
        "active_task": _session_manager.current_task_id if _session_manager else None,
    }


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main():
    import uvicorn

    parser = argparse.ArgumentParser(description="DigiWorld local bridge server")
    parser.add_argument("--port", type=int, default=6800, help="Server port (default: 6800)")
    parser.add_argument(
        "--host", type=str, default="0.0.0.0",
        help="Address to bind (default: 0.0.0.0; use 127.0.0.1 to keep it off the network)",
    )
    parser.add_argument("--device", type=str, default=None, help="ADB device serial (e.g. emulator-5554)")
    parser.add_argument("--digiworld", action="store_true", help="Enable digiworld scenario management")
    parser.add_argument("--state-data", type=str, default=None, help="Path to digiworld state_data/")
    args = parser.parse_args()

    global _DEVICE_SERIAL
    _DEVICE_SERIAL = args.device

    if args.state_data:
        os.environ["DIGIWORLD_STATE_DATA"] = args.state_data

    if args.digiworld:
        if not _init_digiworld():
            logger.error("--digiworld requested but initialization failed")
            sys.exit(1)

    # Verify ADB connectivity
    try:
        result = _adb_shell("getprop sys.boot_completed", timeout=5)
        if result.stdout.strip() == "1":
            logger.info("Emulator connected and ready (device=%s)", _DEVICE_SERIAL or "default")
        else:
            logger.warning("Emulator connected but not fully booted yet (boot_completed=%r)", result.stdout.strip())
    except Exception:
        logger.warning("Could not reach emulator via ADB — start one before sending requests")

    logger.info("Starting local bridge server on %s:%d", args.host, args.port)
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
