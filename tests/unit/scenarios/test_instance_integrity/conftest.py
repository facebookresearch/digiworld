# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared fixtures for instance integrity tests.

Provides auto-discovery of scenario directories, instance directories,
state_data paths, and helper utilities used across all test modules.
"""

import importlib.util
import json
import re
import sqlite3
from pathlib import Path
from types import ModuleType
from typing import Any, Dict, List, Optional, Set, Tuple

import pytest

from digiworld.app_registry import APP_REGISTRY
from digiworld.scenarios.mockdata_validator import (
    BASE_TEMPLATES,
    APP_TEMPLATES,
)

# ---------------------------------------------------------------------------
# Path constants
# ---------------------------------------------------------------------------

_DIGIWORLD_ROOT = Path(__file__).resolve().parents[4] / "digiworld" / "digiworld"
SCENARIOS_ROOT = _DIGIWORLD_ROOT / "scenarios" / "scenarios"
STATE_DATA_DIR = _DIGIWORLD_ROOT / "state_data"

_TEMPLATE_RE = re.compile(r"\{\{(\w+(?::\w+)?)\}\}")

# ---------------------------------------------------------------------------
# Discovery helpers (module-level so parametrize can call them at collection)
# ---------------------------------------------------------------------------


def discover_scenario_dirs() -> List[Path]:
    """Return every directory that contains a scenario_config.json."""
    return sorted(
        p.parent
        for p in SCENARIOS_ROOT.rglob("scenario_config.json")
        if "instances" not in p.parts
    )


def discover_instance_dirs() -> List[Path]:
    """Return every directory that contains an instance_config.json."""
    return sorted(
        p.parent
        for p in SCENARIOS_ROOT.rglob("instances/*/instance_config.json")
    )


def discover_instances_with_mockdata() -> List[Path]:
    """Return instance directories that have a non-empty mockdata/ subdirectory."""
    results = []
    for instance_dir in discover_instance_dirs():
        mockdata_dir = instance_dir / "mockdata"
        if mockdata_dir.is_dir() and any(mockdata_dir.glob("mock-*.json")):
            results.append(instance_dir)
    return results


def _scenario_id(d: Path) -> str:
    """Compact test ID: app/scenario."""
    return f"{d.parent.name}/{d.name}"


def _instance_id(d: Path) -> str:
    """Compact test ID: app/scenario/instance."""
    return f"{d.parts[-4]}/{d.parts[-3]}/{d.name}"


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def state_data_dir() -> Path:
    return STATE_DATA_DIR


@pytest.fixture(scope="session")
def scenarios_root() -> Path:
    return SCENARIOS_ROOT


# ---------------------------------------------------------------------------
# Utility functions shared across test modules
# ---------------------------------------------------------------------------


def load_module_from_path(path: Path) -> ModuleType:
    """Dynamically import a Python file and return the module object."""
    spec = importlib.util.spec_from_file_location(path.stem, path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Cannot load module from {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> Any:
    """Load and parse a JSON file, raising FileNotFoundError if missing."""
    return json.loads(path.read_text())


def get_scenario_config(instance_dir: Path) -> Dict[str, Any]:
    """Load the scenario_config.json that owns an instance directory."""
    return load_json(instance_dir.parent.parent / "scenario_config.json")


def get_profile_db_path(
    app_name: str,
    profile_name: str,
    sdata: Path = STATE_DATA_DIR,
) -> Optional[Path]:
    """Return the path to a profile's SQLite DB, or None if missing."""
    bundle_id = APP_REGISTRY[app_name]["bundle_id"]
    db_path = sdata / bundle_id / profile_name / "sessions" / "default" / "default.db"
    return db_path if db_path.exists() else None


def get_first_compatible_db(
    instance_dir: Path,
    sdata: Path = STATE_DATA_DIR,
) -> Tuple[Dict[str, Any], Path]:
    """Return (instance_config, db_path) for the first compatible profile.

    Raises ``pytest.skip`` if no compatible profile has a usable DB.
    """
    config = load_json(instance_dir / "instance_config.json")
    scenario_config = get_scenario_config(instance_dir)
    app_name = scenario_config["app_name"]

    for profile_name in config.get("compatible_profiles", []):
        db_path = get_profile_db_path(app_name, profile_name, sdata)
        if db_path is not None:
            return config, db_path

    pytest.skip(
        f"No compatible profile DB found for {app_name} instance {instance_dir.name}"
    )


def camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    result = []
    for i, ch in enumerate(name):
        if ch.isupper() and i > 0:
            result.append("_")
        result.append(ch.lower())
    return "".join(result)


def scan_templates(records: List[Dict[str, Any]]) -> Set[str]:
    """Recursively extract all ``{{placeholder}}`` names from records."""
    templates: Set[str] = set()

    def _scan(obj: Any) -> None:
        if isinstance(obj, str):
            for m in _TEMPLATE_RE.finditer(obj):
                templates.add(m.group(1))
        elif isinstance(obj, dict):
            for v in obj.values():
                _scan(v)
        elif isinstance(obj, list):
            for v in obj:
                _scan(v)

    _scan(records)
    return templates


def is_known_template(template: str, app_name: str) -> bool:
    """Check whether a template placeholder is recognised."""
    if template in BASE_TEMPLATES:
        return True
    app_tmpls = APP_TEMPLATES.get(app_name, set())
    if template in app_tmpls:
        return True
    base_key = template.split(":")[0] + ":*" if ":" in template else None
    if base_key and (base_key in BASE_TEMPLATES or base_key in app_tmpls):
        return True
    return False


def get_db_tables(conn: sqlite3.Connection) -> Set[str]:
    """Return the set of user table names in a SQLite database."""
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    ).fetchall()
    return {r[0] for r in rows}


def get_table_columns(conn: sqlite3.Connection, table_name: str) -> Set[str]:
    """Return the set of column names for a table."""
    rows = conn.execute(f"PRAGMA table_info([{table_name}])").fetchall()
    return {r[1] for r in rows}


def db_is_valid_sqlite(path: Path) -> bool:
    """Return True if *path* is a readable SQLite file (not an LFS pointer)."""
    try:
        conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        conn.execute("SELECT 1 FROM sqlite_master LIMIT 1")
        conn.close()
        return True
    except (sqlite3.DatabaseError, sqlite3.OperationalError):
        return False
