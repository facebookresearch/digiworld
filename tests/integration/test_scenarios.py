# Copyright (c) Meta Platforms, Inc. and affiliates.
"""
Integration Tests for Scenario Validation

This module provides:
1. A setup verification test to ensure apps are installed correctly
2. One parametrized test per scenario that resets initial state and verifies
   the scenario is NOT completed (task requires action)

Run with: pytest tests/integration/test_scenarios.py -v
"""

import subprocess
import time
import pytest
from pathlib import Path
from typing import Dict, List, Tuple

from tests.integration.backends import get_project_paths


# Import required modules
try:
    import sys
    _REPO_ROOT = Path(__file__).parent.parent.parent
    sys.path.insert(0, str(_REPO_ROOT / "digiworld"))
    sys.path.insert(0, str(_REPO_ROOT / "digiworld" / "utils"))
    from digiworld.scenarios.scenario_registry import ScenarioRegistry
    from app_config import APP_CONFIG, ALL_APPS
except ImportError as e:
    print(f"Import error: {e}")
    ScenarioRegistry = None
    APP_CONFIG = {}
    ALL_APPS = []


# Mapping from scenario app names to installed app names
SCENARIO_APP_TO_INSTALLED_APP = {
    "payment": "pay",
    "ecommerce": "shop",
}


def get_installed_app_name(scenario_app_name: str) -> str:
    """Map scenario app name to installed app name."""
    return SCENARIO_APP_TO_INSTALLED_APP.get(scenario_app_name, scenario_app_name)


def get_bundle_id_for_app(app_name: str) -> str:
    """Get bundle ID for an app name."""
    if not APP_CONFIG:
        return None
    installed_name = get_installed_app_name(app_name)
    config = APP_CONFIG.get(installed_name)
    if config:
        return config[1]  # Bundle ID is second element
    return None


def check_for_deeplink_error(bundle_id: str = None) -> Tuple[bool, str]:
    """
    Check if the device UI is showing a deep link error.

    Returns:
        tuple: (has_error: bool, error_type: str)
    """
    try:
        if bundle_id:
            result = subprocess.run(
                ["adb", "shell", "dumpsys", "activity", "activities"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0 and bundle_id not in result.stdout:
                return False, ""

        subprocess.run(
            ["adb", "shell", "uiautomator", "dump", "/sdcard/ui_dump.xml"],
            capture_output=True,
            text=True,
            timeout=10
        )

        result = subprocess.run(
            ["adb", "shell", "cat", "/sdcard/ui_dump.xml"],
            capture_output=True,
            text=True,
            timeout=10
        )

        if result.returncode == 0:
            ui_content = result.stdout.lower()
            if "unmatched route" in ui_content or "unmatched_route" in ui_content:
                return True, "unmatched route"
            if "session not found" in ui_content or "session_not_found" in ui_content:
                return True, "session not found"
            if "invalid session" in ui_content:
                return True, "invalid session"

    except Exception:
        pass

    return False, ""


def get_all_scenarios_with_instances() -> List[Tuple[str, str, str, str]]:
    """
    Get all scenarios with ALL their instances for parametrization.

    Returns:
        List of (app_name, task_name, instance_tag, test_id) tuples
    """
    if ScenarioRegistry is None:
        return []

    registry = ScenarioRegistry()
    registry.auto_register_scenarios()
    registry.auto_register_instances()

    scenarios = registry.get_scenario_list()
    all_instances = registry.get_instance_list()

    # Build instance lookup
    instances_by_scenario = {}
    for app, task, inst in all_instances:
        instances_by_scenario.setdefault((app, task), []).append(inst)

    # Return (app, task, instance_tag, test_id) tuples for ALL instances
    result = []
    for app_name, task_name in scenarios:
        instances = instances_by_scenario.get((app_name, task_name), [])
        if instances:
            # Test ALL instances for this scenario
            for instance_tag in instances:
                # Create a short test ID
                short_task = task_name[:30] + "..." if len(task_name) > 30 else task_name
                test_id = f"{app_name}/{short_task}[{instance_tag[:20]}]"
                result.append((app_name, task_name, instance_tag, test_id))
        else:
            # Scenario has no instances - test without instance tag
            short_task = task_name[:30] + "..." if len(task_name) > 30 else task_name
            test_id = f"{app_name}/{short_task}"
            result.append((app_name, task_name, None, test_id))

    return result


# Pre-compute scenarios for parametrization
ALL_SCENARIOS = get_all_scenarios_with_instances()


class TestSetupVerification:
    """Verify that the setup script has installed all apps correctly."""

    def test_all_apps_installed(
        self,
        emulator_backend,
        require_emulator,
        installed_apps: Dict[str, bool],
        app_bundle_ids: Dict[str, str]
    ):
        """Test that all required apps are installed on the emulator."""
        missing_apps = []
        installed_count = 0

        for app_name, is_installed in installed_apps.items():
            if is_installed:
                installed_count += 1
            else:
                missing_apps.append(app_name)

        print(f"\nInstalled apps: {installed_count}/{len(installed_apps)}")
        for app_name, is_installed in sorted(installed_apps.items()):
            status = "✓" if is_installed else "✗"
            print(f"  {status} {app_name}")

        if missing_apps:
            pytest.fail(
                f"Missing apps: {missing_apps}. "
                f"Run the setup script to install all apps."
            )


class TestScenarios:
    """
    Test each scenario: reset initial state and verify task is not completed.

    Each test:
    1. Resets the scenario to its initial state
    2. Verifies the task is NOT completed in the initial state
    3. Checks for any UI errors (unmatched routes, etc.)
    """

    @pytest.mark.parametrize(
        "app_name,task_name,instance_tag,test_id",
        [
            pytest.param(app, task, inst, tid, id=tid)
            for app, task, inst, tid in ALL_SCENARIOS
        ]
    )
    def test_scenario(
        self,
        app_name: str,
        task_name: str,
        instance_tag: str,
        test_id: str,
        emulator_backend,
        require_emulator,
        scenario_registry,
        installed_apps: Dict[str, bool],
        project_paths: Dict[str, Path]
    ):
        """Test that a scenario can reset and is not completed initially."""
        # Check if app is installed
        installed_app_name = get_installed_app_name(app_name)
        if not installed_apps.get(installed_app_name, False):
            pytest.skip(f"App {app_name} ({installed_app_name}) not installed")

        # Get scenario class
        scenario_class = scenario_registry.registry.get((app_name, task_name))
        if not scenario_class:
            pytest.fail(f"Scenario class not found for {app_name}/{task_name}")

        state_data = str(project_paths["state_data"])
        bundle_id = get_bundle_id_for_app(app_name)

        # Force stop and relaunch app for clean state
        if bundle_id:
            emulator_backend.execute_command(
                f"am force-stop {bundle_id}", is_shell=True
            )
            time.sleep(1)
            emulator_backend.execute_command(
                f"monkey -p {bundle_id} -c android.intent.category.LAUNCHER 1",
                is_shell=True
            )
            time.sleep(2)

        # Initialize scenario
        scenario = scenario_class(
            base_path=state_data,
            backend=emulator_backend,
            instance_tag=instance_tag
        )

        # Reset to initial state
        scenario.reset_initial_state()

        # Wait for app to stabilize
        time.sleep(2)

        # Check for UI errors
        if bundle_id:
            has_error, error_type = check_for_deeplink_error(bundle_id)
            if has_error:
                pytest.fail(
                    f"Deep link error detected: '{error_type}' "
                    f"for {app_name}/{task_name}"
                )

        # Verify scenario is NOT completed in initial state
        initial_state = scenario.adb.persist_state()
        metrics = scenario.verify_trajectory([initial_state])

        task_completed = metrics.get("task_completed", 0.0)
        assert task_completed < 1.0, (
            f"Scenario should NOT be completed in initial state. "
            f"task_completed={task_completed}, metrics={metrics}"
        )

        # Print task description for reference
        task_desc = scenario.get_task_description()
        print(f"\n  Task: {task_desc[:80]}..." if len(task_desc) > 80 else f"\n  Task: {task_desc}")
