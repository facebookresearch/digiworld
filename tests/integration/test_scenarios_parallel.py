# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Parallel Scenario Integration Tests

Runs scenario tests across all Genymotion emulators defined in emulators.json.
Each scenario is assigned to an emulator via round-robin distribution.
Tests use the emulator's own backend so they never collide with each other.

Usage:
    # Run all scenarios (sequentially, but each test talks to its assigned emulator)
    pytest tests/integration/test_scenarios_parallel.py -v

    # Run in PARALLEL with pytest-xdist (recommended for speed)
    pytest tests/integration/test_scenarios_parallel.py -v -n 12 --dist=loadgroup

    # Filter by app name
    pytest tests/integration/test_scenarios_parallel.py -v -n 12 --dist=loadgroup -k "eats"

    # Use only a subset of emulators (1-based indices, via env var)
    PARALLEL_EMULATORS=1,2,3 pytest tests/integration/test_scenarios_parallel.py -v -n 3 --dist=loadgroup

    # With standard pytest (no xdist) — runs sequentially
    pytest tests/integration/test_scenarios_parallel.py -v

Prerequisites:
    pip install pytest-xdist    # for parallel execution
"""

import json
import os
import sys
import time
import pytest
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# =============================================================================
# Path setup
# =============================================================================

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_DIGIWORLD_PATH = _REPO_ROOT / "digiworld"
_UTILS_PATH = _REPO_ROOT / "digiworld" / "utils"

for _p in [str(_DIGIWORLD_PATH), str(_UTILS_PATH)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from digiworld.adb.backends import GenymotionBackend, ADBBackend, EmulatorBackend
from digiworld.scenarios.scenario_registry import ScenarioRegistry

try:
    from app_config import APP_CONFIG
except ImportError:
    APP_CONFIG = {}


# =============================================================================
# Module-level setup: load emulators and scenarios for parametrization
# =============================================================================

SCENARIO_APP_TO_INSTALLED_APP = {
    "payment": "pay",
    "ecommerce": "shop",
}


def _get_installed_app_name(scenario_app: str) -> str:
    return SCENARIO_APP_TO_INSTALLED_APP.get(scenario_app, scenario_app)


def _get_bundle_id(app_name: str) -> Optional[str]:
    installed = _get_installed_app_name(app_name)
    cfg = APP_CONFIG.get(installed)
    return cfg[1] if cfg else None


def _discover_local_adb_devices() -> List[str]:
    """Discover all connected ADB devices/emulators via ``adb devices``."""
    import subprocess

    try:
        result = subprocess.run(
            ["adb", "devices"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        serials = []
        for line in result.stdout.strip().splitlines()[1:]:  # skip header
            parts = line.split()
            if len(parts) >= 2 and parts[1] == "device":
                serials.append(parts[0])
        return serials
    except Exception:
        return []


def _load_emulators() -> List[dict]:
    """Load emulator configs from emulators.json, optionally filtered by env var.

    When no Genymotion IPs and no explicit ADB serials are configured,
    auto-discovers ALL locally connected ADB devices/emulators so tests
    are distributed across every available emulator automatically.
    """
    path = _UTILS_PATH / "emulators.json"
    if not path.exists():
        # No config file — fall back to auto-discovery
        serials = _discover_local_adb_devices()
        if serials:
            return [{"serial": s, "type": "adb"} for s in serials]
        return [{"serial": None, "type": "adb"}]

    with open(path) as f:
        config = json.load(f)

    emulators = []
    if "genymotion" in config:
        gc = config["genymotion"]
        for ip in gc.get("ips", []):
            emulators.append({
                "ip": ip,
                "username": gc.get("username"),
                "password": gc.get("password"),
                "type": "genymotion",
            })
    if "adb" in config:
        serials = config["adb"].get("serials", [])
        if serials:
            for serial in serials:
                emulators.append({"serial": serial, "type": "adb"})

    # No explicit emulators configured — auto-discover local ADB devices
    if not emulators:
        discovered = _discover_local_adb_devices()
        if discovered:
            for serial in discovered:
                emulators.append({"serial": serial, "type": "adb"})
            print(f"Auto-discovered {len(discovered)} ADB device(s): "
                  f"{', '.join(discovered)}")
        else:
            # Last resort: use default (first/only) ADB device
            emulators.append({"serial": None, "type": "adb"})

    # PARALLEL_EMULATORS=1,2,3 selects a subset (1-based)
    indices_env = os.environ.get("PARALLEL_EMULATORS")
    if indices_env:
        indices = [int(i) - 1 for i in indices_env.split(",")]
        emulators = [emulators[i] for i in indices if 0 <= i < len(emulators)]

    return emulators


def _get_all_scenarios() -> List[Tuple[str, str, Optional[str], str]]:
    """Load all scenario/instance combinations from the registry."""
    try:
        registry = ScenarioRegistry()
        registry.auto_register_scenarios()
        registry.auto_register_instances()
    except Exception:
        return []

    scenarios = registry.get_scenario_list()
    all_instances = registry.get_instance_list()

    by_scenario: Dict[Tuple[str, str], List[str]] = {}
    for app, task, inst in all_instances:
        by_scenario.setdefault((app, task), []).append(inst)

    # Detect which scenarios have an instances/ directory on disk so we
    # can distinguish "standalone (no instances needed)" from "all instances
    # filtered out (skip entirely)".
    _scenarios_dir = Path(__file__).resolve().parent.parent.parent / (
        "digiworld" / Path("digiworld/scenarios/scenarios")
    )
    def _has_instances_dir(app: str, task: str) -> bool:
        """Return True if the scenario has an instances/ directory on disk."""
        sc_class = registry.registry.get((app, task))
        if sc_class:
            import inspect
            sc_file = Path(inspect.getfile(sc_class)).parent
            return (sc_file / "instances").is_dir()
        return False

    result = []
    for app_name, task_name in scenarios:
        instances = by_scenario.get((app_name, task_name), [])
        if instances:
            for inst_tag in instances:
                short_task = task_name[:30] + "..." if len(task_name) > 30 else task_name
                tid = f"{app_name}/{short_task}[{inst_tag[:20]}]"
                result.append((app_name, task_name, inst_tag, tid))
        elif not _has_instances_dir(app_name, task_name):
            # Standalone scenario (no instances needed)
            short_task = task_name[:30] + "..." if len(task_name) > 30 else task_name
            tid = f"{app_name}/{short_task}"
            result.append((app_name, task_name, None, tid))
        # else: scenario has instances dir but all were filtered out — skip

    return result


# Pre-compute at import time (pytest parametrize requires this)
EMULATORS = _load_emulators()
ALL_SCENARIOS = _get_all_scenarios()

# Assign each scenario to an emulator via round-robin, with xdist_group marks
# so that `--dist=loadgroup` keeps all tests for one emulator in the same worker.
PARALLEL_PARAMS = []
if EMULATORS:
    for idx, (app, task, inst, tid) in enumerate(ALL_SCENARIOS):
        emulator_idx = idx % len(EMULATORS)
        emulator_label = EMULATORS[emulator_idx].get(
            "ip", EMULATORS[emulator_idx].get("serial", str(emulator_idx))
        )
        PARALLEL_PARAMS.append(
            pytest.param(
                app, task, inst, tid, emulator_idx,
                id=tid,
                marks=pytest.mark.xdist_group(name=f"emulator_{emulator_idx}"),
            )
        )


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture(scope="session")
def emulator_pool():
    """
    Lazily-created pool of emulator backends.

    Returns a callable: get_backend(idx) -> EmulatorBackend.
    Backends are cached per session so each emulator is only initialised once.
    """
    cache: Dict[int, EmulatorBackend] = {}

    def _get_backend(idx: int) -> EmulatorBackend:
        if idx not in cache:
            emu = EMULATORS[idx]
            if emu["type"] == "genymotion":
                cache[idx] = GenymotionBackend(
                    ip=emu["ip"],
                    username=emu["username"],
                    password=emu["password"],
                    use_env_variables=False,
                )
            else:
                cache[idx] = ADBBackend(
                    device_serial=emu.get("serial") or None
                )
        return cache[idx]

    return _get_backend


@pytest.fixture(scope="session")
def parallel_scenario_registry():
    """Scenario registry for parallel tests (independent from single-emulator fixtures)."""
    registry = ScenarioRegistry()
    registry.auto_register_scenarios()
    registry.auto_register_instances()
    return registry


@pytest.fixture(scope="session", autouse=True)
def _parallel_cleanup(request):
    """Clean up generated states after all parallel tests complete."""
    def cleanup():
        try:
            from cleanup import clean_non_default_states, clean_db_forge_directories

            state_data_path = _REPO_ROOT / "digiworld" / "digiworld" / "state_data"
            adb_api_path = _REPO_ROOT / "digiworld"
            data_path = adb_api_path / "data"

            clean_non_default_states(state_data_path, dry_run=False)
            if data_path.exists():
                clean_db_forge_directories(data_path, dry_run=False)
        except Exception:
            pass

    request.addfinalizer(cleanup)


# =============================================================================
# Helpers
# =============================================================================

def _check_deeplink_error(
    backend: EmulatorBackend, bundle_id: Optional[str] = None
) -> Tuple[bool, str]:
    """
    Check for deep link errors using the backend (not raw adb).

    This is safe for parallel execution — each backend talks to its own emulator.
    """
    try:
        if bundle_id:
            out = backend.run_shell_with_output("dumpsys activity activities")
            if out and bundle_id not in out:
                return False, ""

        backend.execute_command(
            "uiautomator dump /sdcard/ui_dump.xml", is_shell=True
        )
        content = backend.read_file("/sdcard/ui_dump.xml")
        if content:
            lower = content.lower()
            for keyword, label in [
                ("unmatched route", "unmatched route"),
                ("unmatched_route", "unmatched route"),
                ("session not found", "session not found"),
                ("session_not_found", "session not found"),
                ("invalid session", "invalid session"),
            ]:
                if keyword in lower:
                    return True, label
    except Exception:
        pass

    return False, ""


# =============================================================================
# Tests
# =============================================================================

@pytest.mark.skipif(not EMULATORS, reason="No emulators configured in emulators.json")
@pytest.mark.skipif(not ALL_SCENARIOS, reason="No scenarios found in registry")
class TestScenariosParallel:
    """
    Parallel scenario tests distributed across all configured emulators.

    Each scenario is assigned to a specific emulator via round-robin.

    For actual parallel execution install pytest-xdist and run:
        pytest tests/integration/test_scenarios_parallel.py -n 12 --dist=loadgroup

    The xdist_group marks ensure all tests for one emulator stay in the same
    worker process, so each worker only needs one backend connection.
    """

    @pytest.mark.parametrize(
        "app_name,task_name,instance_tag,test_id,emulator_idx",
        PARALLEL_PARAMS,
    )
    def test_scenario(
        self,
        app_name: str,
        task_name: str,
        instance_tag: Optional[str],
        test_id: str,
        emulator_idx: int,
        emulator_pool,
        parallel_scenario_registry,
    ):
        """Test that a scenario resets correctly and is not completed initially."""
        backend = emulator_pool(emulator_idx)
        emulator_label = EMULATORS[emulator_idx].get(
            "ip", EMULATORS[emulator_idx].get("serial", "?")
        )

        # Look up scenario class
        scenario_class = parallel_scenario_registry.registry.get((app_name, task_name))
        assert scenario_class is not None, (
            f"Scenario class not found for {app_name}/{task_name}"
        )

        state_data = str(_REPO_ROOT / "digiworld" / "digiworld" / "state_data")
        bundle_id = _get_bundle_id(app_name)

        # Force stop and relaunch app for a clean state
        if bundle_id:
            backend.execute_command(f"am force-stop {bundle_id}", is_shell=True)
            time.sleep(1)
            backend.execute_command(
                f"monkey -p {bundle_id} -c android.intent.category.LAUNCHER 1",
                is_shell=True,
            )
            time.sleep(2)

        # Initialize and reset scenario
        scenario = scenario_class(
            base_path=state_data,
            backend=backend,
            instance_tag=instance_tag,
        )
        scenario.reset_initial_state()
        time.sleep(2)

        # Check for UI errors
        if bundle_id:
            has_error, error_type = _check_deeplink_error(backend, bundle_id)
            assert not has_error, (
                f"Deep link error '{error_type}' on {emulator_label} "
                f"for {app_name}/{task_name}"
            )

        # Verify scenario is NOT completed in initial state
        initial_state = scenario.adb.persist_state()
        metrics = scenario.verify_trajectory([initial_state])
        task_completed = metrics.get("task_completed", 0.0)

        assert task_completed < 1.0, (
            f"Scenario should NOT be completed in initial state on {emulator_label}. "
            f"task_completed={task_completed}, metrics={metrics}"
        )

        # Print info for pytest -v -s output
        task_desc = scenario.get_task_description()
        short_desc = task_desc[:80] + "..." if len(task_desc) > 80 else task_desc
        print(f"\n  [{emulator_label}] Task: {short_desc}")
