# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for '<action> all of my <item_type>'.

Requires devices, scenes, and automations to already exist in the profile
so that any action/item_type combination has items to toggle, and at least one
item of <item_type> must not already be in the requested state (otherwise the
task is complete before it starts).
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint
from digiworld.scenarios.scenarios.smarthome.shared import (
    AUTOMATIONS_EXIST,
    DEVICES_EXIST,
    SCENES_EXIST,
)

_COLUMNS = {"devices": "is_on", "scenes": "is_active", "automations": "is_active"}
_ACTIVATE = {"turn on", "enable"}


class SomethingToToggleConstraint(Constraint):
    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        table = str(params.get("item_type") or "").strip().lower()
        column = _COLUMNS.get(table)
        if column is None:
            return False
        wrong_state = (
            0 if str(params.get("action") or "").strip().lower() in _ACTIVATE else 1
        )
        try:
            row = conn.execute(
                f"SELECT COUNT(*) FROM {table} WHERE user_id = 1 AND {column} = ? AND deleted_at IS NULL",
                (wrong_state,),
            ).fetchone()
        except sqlite3.OperationalError:
            return False
        return bool(row and row[0])

    def describe(self) -> str:
        return "SomethingToToggle(item_type not all in the target state)"


CONSTRAINTS = [
    DEVICES_EXIST,
    SCENES_EXIST,
    AUTOMATIONS_EXIST,
    SomethingToToggleConstraint(),
]
