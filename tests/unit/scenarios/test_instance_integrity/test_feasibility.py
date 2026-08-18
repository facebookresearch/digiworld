# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraint re-evaluation tests.

For every instance that declares compatible_profiles, re-evaluate the
constraints from feasibility.py against each listed profile's DB and
confirm the profiles are truly compatible.  Catches situations where
profile data has changed since instances were generated.
"""

import sqlite3

import pytest

from digiworld.app_registry import APP_REGISTRY

from .conftest import (
    STATE_DATA_DIR,
    db_is_valid_sqlite,
    discover_instance_dirs,
    get_scenario_config,
    load_json,
    load_module_from_path,
    get_profile_db_path,
    _instance_id,
)


def _instances_with_feasibility():
    """Instance dirs whose parent scenario has a feasibility.py."""
    results = []
    for d in discover_instance_dirs():
        scenario_dir = d.parent.parent
        if (scenario_dir / "feasibility.py").exists():
            results.append(d)
    return results


_INSTANCES_WITH_FEASIBILITY = _instances_with_feasibility()


@pytest.mark.instance_integrity
class TestFeasibilityConstraints:
    """Re-run feasibility constraints to verify compatible_profiles accuracy."""

    @pytest.mark.parametrize(
        "instance_dir", _INSTANCES_WITH_FEASIBILITY, ids=_instance_id
    )
    def test_constraints_pass_for_all_declared_profiles(self, instance_dir):
        config = load_json(instance_dir / "instance_config.json")
        scenario_config = get_scenario_config(instance_dir)
        app_name = scenario_config["app_name"]

        scenario_dir = instance_dir.parent.parent
        module = load_module_from_path(scenario_dir / "feasibility.py")
        constraints = module.CONSTRAINTS

        if not constraints:
            pytest.skip("No constraints defined")

        errors = []
        for profile_name in config.get("compatible_profiles", []):
            db_path = get_profile_db_path(app_name, profile_name)
            if db_path is None:
                errors.append(
                    f"Profile '{profile_name}': no DB found at expected path"
                )
                continue
            if not db_is_valid_sqlite(db_path):
                continue

            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            for constraint in constraints:
                if not constraint.evaluate(conn, config["parameters"]):
                    errors.append(
                        f"Profile '{profile_name}': constraint "
                        f"{constraint.describe()} FAILED"
                    )
            conn.close()

        assert not errors, (
            "Feasibility check failures:\n" + "\n".join(errors)
        )

    @pytest.mark.parametrize(
        "instance_dir", _INSTANCES_WITH_FEASIBILITY, ids=_instance_id
    )
    def test_feasibility_constraints_importable(self, instance_dir):
        """feasibility.py exports a CONSTRAINTS list."""
        scenario_dir = instance_dir.parent.parent
        module = load_module_from_path(scenario_dir / "feasibility.py")
        assert hasattr(module, "CONSTRAINTS"), (
            "feasibility.py must export CONSTRAINTS"
        )
        assert isinstance(module.CONSTRAINTS, list), (
            f"CONSTRAINTS must be a list, got {type(module.CONSTRAINTS).__name__}"
        )


@pytest.mark.instance_integrity
class TestFeasibilityStructure:
    """Validate feasibility.py files across all scenarios (not just instances)."""

    @staticmethod
    def _scenarios_with_feasibility():
        from .conftest import discover_scenario_dirs, _scenario_id
        return [
            d for d in discover_scenario_dirs()
            if (d / "feasibility.py").exists()
        ]

    @pytest.mark.parametrize(
        "scenario_dir",
        _scenarios_with_feasibility.__func__(),
        ids=lambda d: f"{d.parent.name}/{d.name}",
    )
    def test_constraints_have_describe(self, scenario_dir):
        """Every constraint must implement describe() for debuggability."""
        module = load_module_from_path(scenario_dir / "feasibility.py")
        for i, constraint in enumerate(module.CONSTRAINTS):
            desc = constraint.describe()
            assert isinstance(desc, str) and len(desc) > 0, (
                f"Constraint [{i}] in {scenario_dir.name}/feasibility.py "
                f"has empty or non-string describe()"
            )
