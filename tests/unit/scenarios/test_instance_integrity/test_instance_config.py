# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Instance configuration integrity tests.

Auto-discovers every generated instance_config.json and validates:
- Required keys and value types
- Parameters match those declared in the parent scenario_config.json
- compatible_profiles list is non-empty and references real state_data dirs
- additional_mockdata flag is consistent with mockdata/ directory presence
- mockdata/ files (when present) are non-empty JSON arrays
"""

import pytest

from digiworld.app_registry import APP_REGISTRY

from .conftest import (
    STATE_DATA_DIR,
    discover_instance_dirs,
    get_scenario_config,
    load_json,
    _instance_id,
)


_ALL_INSTANCE_DIRS = discover_instance_dirs()


@pytest.mark.instance_integrity
class TestInstanceConfigSchema:
    """Validate the schema of every instance_config.json."""

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_has_required_keys(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        assert "parameters" in config, "Missing 'parameters'"
        assert "compatible_profiles" in config, "Missing 'compatible_profiles'"

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_parameters_is_dict(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        assert isinstance(config["parameters"], dict), (
            f"'parameters' should be a dict, got {type(config['parameters']).__name__}"
        )

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_compatible_profiles_nonempty(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        profiles = config["compatible_profiles"]
        assert isinstance(profiles, list), "'compatible_profiles' must be a list"
        assert len(profiles) > 0, "compatible_profiles is empty -- no profile can run this instance"


@pytest.mark.instance_integrity
class TestInstanceParameterConsistency:
    """Ensure instance parameters match scenario_config.json declarations."""

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_parameter_keys_match_scenario_config(self, instance_dir):
        instance_config = load_json(instance_dir / "instance_config.json")
        scenario_config = get_scenario_config(instance_dir)
        expected = set(scenario_config["parameters"])
        actual = set(instance_config["parameters"].keys())
        assert actual == expected, (
            f"Parameter key mismatch: scenario declares {sorted(expected)}, "
            f"instance has {sorted(actual)}"
        )

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_parameter_values_nonempty(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        for key, value in config["parameters"].items():
            assert value is not None, f"Parameter '{key}' is None"
            if isinstance(value, str):
                assert len(value.strip()) > 0, f"Parameter '{key}' is blank"


@pytest.mark.instance_integrity
class TestCompatibleProfilesExist:
    """Verify that every profile listed in compatible_profiles has state_data."""

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_profiles_have_state_data_dirs(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        scenario_config = get_scenario_config(instance_dir)
        app_name = scenario_config["app_name"]
        bundle_id = APP_REGISTRY[app_name]["bundle_id"]
        app_state_dir = STATE_DATA_DIR / bundle_id

        if not app_state_dir.is_dir():
            pytest.skip(f"No state_data directory for app '{app_name}'")

        existing = {d.name for d in app_state_dir.iterdir() if d.is_dir()}
        missing = [p for p in config["compatible_profiles"] if p not in existing]
        assert not missing, (
            f"Profiles not found in state_data/{bundle_id}/: {missing}"
        )

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_at_least_one_profile_has_db(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        scenario_config = get_scenario_config(instance_dir)
        app_name = scenario_config["app_name"]
        bundle_id = APP_REGISTRY[app_name]["bundle_id"]
        app_state_dir = STATE_DATA_DIR / bundle_id

        if not app_state_dir.is_dir():
            pytest.skip(f"No state_data directory for app '{app_name}'")

        has_db = False
        for profile in config["compatible_profiles"]:
            db = app_state_dir / profile / "sessions" / "default" / "default.db"
            if db.exists():
                has_db = True
                break

        assert has_db, (
            "None of the compatible profiles have a sessions/default/default.db"
        )


@pytest.mark.instance_integrity
class TestMockdataDirectoryConsistency:
    """Validate mockdata directory presence/absence vs additional_mockdata flag."""

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_mockdata_dir_when_additional_mockdata_true(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        if not config.get("additional_mockdata"):
            pytest.skip("additional_mockdata is false/absent")

        mockdata_dir = instance_dir / "mockdata"
        assert mockdata_dir.is_dir(), (
            "additional_mockdata=true but mockdata/ directory does not exist"
        )
        json_files = list(mockdata_dir.glob("mock-*.json"))
        assert len(json_files) > 0, (
            "additional_mockdata=true but mockdata/ contains no mock-*.json files"
        )

    @pytest.mark.parametrize("instance_dir", _ALL_INSTANCE_DIRS, ids=_instance_id)
    def test_mockdata_files_are_nonempty_arrays(self, instance_dir):
        mockdata_dir = instance_dir / "mockdata"
        if not mockdata_dir.is_dir():
            pytest.skip("No mockdata directory")

        for json_file in sorted(mockdata_dir.glob("mock-*.json")):
            records = load_json(json_file)
            assert isinstance(records, list), (
                f"{json_file.name} root value must be a JSON array, "
                f"got {type(records).__name__}"
            )
            assert len(records) > 0, f"{json_file.name} is an empty array"
