# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Profile compatibility checker.

Evaluates constraints against each profile's SQLite database at generation
time to determine which profiles an instance can safely run against.
Runs per-instance so that different parameter values produce different
compatible profile sets.
"""

import logging
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

from digiworld.app_registry import APP_REGISTRY
from digiworld.profile_variants import is_variant
from digiworld.scenarios.constraints import Constraint

logger = logging.getLogger(__name__)


class ProfileCompatibilityChecker:
    """Determine compatible profiles by evaluating constraints against profile DBs."""

    def __init__(self, state_data_dir: Path):
        self._state_data_dir = state_data_dir

    def find_compatible_profiles(
        self,
        app_name: str,
        constraints: List[Constraint],
        instance_params: Dict[str, Any],
    ) -> List[str]:
        """Return the list of profile names compatible with the given instance.

        If no constraints are declared, all profiles with a valid DB are
        considered compatible.

        Raises ``ValueError`` if zero profiles are compatible.
        """
        bundle_id = APP_REGISTRY[app_name]["bundle_id"]
        app_state_dir = self._state_data_dir / bundle_id

        if not app_state_dir.is_dir():
            raise ValueError(
                f"No state_data directory for app '{app_name}' "
                f"(expected {app_state_dir})"
            )

        all_profiles = self._list_profiles(app_state_dir)

        if not constraints:
            return all_profiles

        compatible: List[str] = []
        for profile_name in all_profiles:
            db_path = (
                app_state_dir / profile_name / "sessions" / "default" / "default.db"
            )
            if self._evaluate_all(db_path, constraints, instance_params):
                compatible.append(profile_name)
            else:
                logger.debug(
                    "Profile '%s' incompatible with params %s",
                    profile_name,
                    instance_params,
                )

        if not compatible:
            constraint_descs = [c.describe() for c in constraints]
            raise ValueError(
                f"No compatible profiles for {app_name} with params "
                f"{instance_params}. Constraints: {constraint_descs}"
            )

        return compatible

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _list_profiles(app_state_dir: Path) -> List[str]:
        """List base (non-variant) profiles that contain a valid session DB.

        Variant directories (identified by a ``_variant_of.json`` marker)
        are skipped because they share the same database as their base
        profile and therefore produce identical constraint results.
        """
        profiles = []
        for item in sorted(app_state_dir.iterdir()):
            if not item.is_dir():
                continue
            if is_variant(str(item)):
                continue
            db_path = item / "sessions" / "default" / "default.db"
            if db_path.exists():
                profiles.append(item.name)
        return profiles

    @staticmethod
    def _evaluate_all(
        db_path: Path,
        constraints: List[Constraint],
        params: Dict[str, Any],
    ) -> bool:
        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        except sqlite3.OperationalError:
            logger.warning("Cannot open DB at %s", db_path)
            return False

        try:
            for constraint in constraints:
                if not constraint.evaluate(conn, params):
                    logger.debug(
                        "Constraint %s failed against %s",
                        constraint.describe(),
                        db_path,
                    )
                    return False
            return True
        finally:
            conn.close()
