# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Structural integrity tests for scenario directories.

Auto-discovers every scenario via scenario_config.json and validates:
- Required files exist (scenario.py, scenario_config.json)
- scenario_config.json schema is well-formed
- Declared scenario class is importable
- Parameter placeholders in task_name match declared parameters
"""

import json

import pytest

from digiworld.app_registry import APP_REGISTRY

from .conftest import (
    discover_scenario_dirs,
    load_json,
    load_module_from_path,
    _scenario_id,
)


_ALL_SCENARIO_DIRS = discover_scenario_dirs()

REQUIRED_CONFIG_KEYS = {"task_name", "app_name", "scenario_class", "parameters"}


@pytest.mark.instance_integrity
class TestScenarioStructure:
    """Validate the file/directory structure of every scenario."""

    @pytest.mark.parametrize("scenario_dir", _ALL_SCENARIO_DIRS, ids=_scenario_id)
    def test_scenario_config_has_required_keys(self, scenario_dir):
        config = load_json(scenario_dir / "scenario_config.json")
        missing = REQUIRED_CONFIG_KEYS - set(config.keys())
        assert not missing, f"Missing keys in scenario_config.json: {missing}"

    @pytest.mark.parametrize("scenario_dir", _ALL_SCENARIO_DIRS, ids=_scenario_id)
    def test_app_name_in_registry(self, scenario_dir):
        config = load_json(scenario_dir / "scenario_config.json")
        assert config["app_name"] in APP_REGISTRY, (
            f"app_name '{config['app_name']}' is not registered in APP_REGISTRY"
        )

    @pytest.mark.parametrize("scenario_dir", _ALL_SCENARIO_DIRS, ids=_scenario_id)
    def test_parameters_is_list(self, scenario_dir):
        config = load_json(scenario_dir / "scenario_config.json")
        assert isinstance(config["parameters"], list), (
            f"'parameters' should be a list, got {type(config['parameters']).__name__}"
        )

    @pytest.mark.parametrize("scenario_dir", _ALL_SCENARIO_DIRS, ids=_scenario_id)
    def test_scenario_py_exists(self, scenario_dir):
        assert (scenario_dir / "scenario.py").exists(), (
            f"scenario.py missing in {scenario_dir}"
        )

    @pytest.mark.parametrize("scenario_dir", _ALL_SCENARIO_DIRS, ids=_scenario_id)
    def test_scenario_class_importable(self, scenario_dir):
        config = load_json(scenario_dir / "scenario_config.json")
        module = load_module_from_path(scenario_dir / "scenario.py")
        assert hasattr(module, config["scenario_class"]), (
            f"Class '{config['scenario_class']}' not found in scenario.py"
        )

    @pytest.mark.parametrize("scenario_dir", _ALL_SCENARIO_DIRS, ids=_scenario_id)
    def test_parameters_match_task_template(self, scenario_dir):
        config = load_json(scenario_dir / "scenario_config.json")
        for param in config["parameters"]:
            assert f"<{param}>" in config["task_name"], (
                f"Parameter '{param}' declared but not referenced as <{param}> "
                f"in task_name: '{config['task_name']}'"
            )
