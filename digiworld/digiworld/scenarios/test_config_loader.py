# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import tempfile
import unittest
from pathlib import Path

from digiworld.scenarios.config_loader import ConfigLoader


class _DummyScenario:
    def __init__(self):
        self.instance_tag = None
        self.scenario_config = {"context_fields": []}
        self.raw_scenario_context = {}
        self.instance_configs = {}


def _write_instance_config(instances_dir: Path, name: str, parameters=None):
    instance_dir = instances_dir / name
    instance_dir.mkdir(parents=True, exist_ok=True)
    with open(instance_dir / "instance_config.json", "w") as f:
        json.dump(
            {
                "parameters": parameters or {},
                "compatible_profiles": ["default"],
                "additional_mockdata": False,
            },
            f,
        )


class TestConfigLoader(unittest.TestCase):
    def test_auto_selects_single_instance(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            scenario_dir = Path(tmpdir)
            instances_dir = scenario_dir / "instances"
            _write_instance_config(
                instances_dir,
                "login_default_profile",
                {"phone_number": "5551234567"},
            )

            scenario = _DummyScenario()
            loader = ConfigLoader(scenario)
            loader._load_instance_configs(scenario_dir, None)

            self.assertEqual(scenario.instance_tag, "login_default_profile")
            self.assertEqual(scenario.parameters["phone_number"], "5551234567")
            self.assertIn("login_default_profile", scenario.instance_configs)

    def test_auto_selects_first_instance_when_multiple_exist(self):
        """Without DIGIWORLD_RANDOMIZE_INSTANCE, picks the first alphabetically."""
        import os
        os.environ.pop("DIGIWORLD_RANDOMIZE_INSTANCE", None)
        with tempfile.TemporaryDirectory() as tmpdir:
            scenario_dir = Path(tmpdir)
            instances_dir = scenario_dir / "instances"
            _write_instance_config(instances_dir, "beta", {"x": "1"})
            _write_instance_config(instances_dir, "alpha", {"x": "2"})

            scenario = _DummyScenario()
            loader = ConfigLoader(scenario)
            loader._load_instance_configs(scenario_dir, None)

            self.assertEqual(scenario.instance_tag, "alpha")

    def test_randomize_instance_when_env_var_set(self):
        """DIGIWORLD_RANDOMIZE_INSTANCE=true picks randomly among available."""
        import os
        os.environ["DIGIWORLD_RANDOMIZE_INSTANCE"] = "true"
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                scenario_dir = Path(tmpdir)
                instances_dir = scenario_dir / "instances"
                _write_instance_config(instances_dir, "one", {"x": "1"})
                _write_instance_config(instances_dir, "two", {"x": "2"})

                scenario = _DummyScenario()
                loader = ConfigLoader(scenario)
                loader._load_instance_configs(scenario_dir, None)

                self.assertIn(scenario.instance_tag, ["one", "two"])
        finally:
            os.environ.pop("DIGIWORLD_RANDOMIZE_INSTANCE", None)


if __name__ == "__main__":
    unittest.main()
