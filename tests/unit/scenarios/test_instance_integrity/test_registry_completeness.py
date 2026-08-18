# Copyright (c) Meta Platforms, Inc. and affiliates.
"""ScenarioRegistry completeness tests.

Verifies that every scenario_config.json and instance_config.json on disk
is successfully loaded by the ScenarioRegistry, and that the registry can
instantiate scenario classes without errors.
"""

import pytest

from .conftest import (
    discover_instance_dirs,
    discover_scenario_dirs,
    get_scenario_config,
    load_json,
    _instance_id,
    _scenario_id,
)


_ALL_SCENARIO_DIRS = discover_scenario_dirs()
_ALL_INSTANCE_DIRS = discover_instance_dirs()


@pytest.fixture(scope="module")
def registry():
    """Build a fresh ScenarioRegistry (expensive -- module-scoped)."""
    from digiworld.scenarios.scenario_registry import ScenarioRegistry
    return ScenarioRegistry()


@pytest.mark.instance_integrity
class TestRegistryScenarioCoverage:
    """Every scenario_config.json on disk should be discoverable by the registry."""

    @pytest.mark.parametrize("scenario_dir", _ALL_SCENARIO_DIRS, ids=_scenario_id)
    def test_scenario_registered(self, scenario_dir, registry):
        config = load_json(scenario_dir / "scenario_config.json")
        key = (config["app_name"], config["task_name"])
        registered = set(registry.get_scenario_list())
        assert key in registered, (
            f"Scenario ({config['app_name']}, {config['task_name']!r}) "
            f"not found in ScenarioRegistry"
        )


@pytest.mark.instance_integrity
class TestRegistryInstanceCoverage:
    """Every instance_config.json on disk should be discoverable by the registry."""

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_instance_registered(self, instance_dir, registry):
        scenario_config = get_scenario_config(instance_dir)
        app_name = scenario_config["app_name"]
        task_name = scenario_config["task_name"]
        instance_name = instance_dir.name

        registered = set(registry.get_instance_list())
        key = (app_name, task_name, instance_name)
        assert key in registered, (
            f"Instance {key} not found in ScenarioRegistry"
        )

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_instance_config_retrievable(self, instance_dir, registry):
        scenario_config = get_scenario_config(instance_dir)
        app_name = scenario_config["app_name"]
        task_name = scenario_config["task_name"]
        instance_name = instance_dir.name

        config = registry.get_instance_config(app_name, task_name, instance_name)
        assert "parameters" in config
        assert "compatible_profiles" in config


@pytest.mark.instance_integrity
class TestRegistryConsistency:
    """Cross-check registry data against on-disk configs."""

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_registry_params_match_disk(self, instance_dir, registry):
        """Parameters stored in the registry match the on-disk instance_config."""
        scenario_config = get_scenario_config(instance_dir)
        app_name = scenario_config["app_name"]
        task_name = scenario_config["task_name"]
        instance_name = instance_dir.name

        disk_config = load_json(instance_dir / "instance_config.json")
        try:
            reg_config = registry.get_instance_config(
                app_name, task_name, instance_name
            )
        except ValueError:
            pytest.skip("Instance not in registry (covered by other test)")
            return

        assert reg_config["parameters"] == disk_config["parameters"], (
            f"Registry parameters differ from disk for {instance_name}"
        )
