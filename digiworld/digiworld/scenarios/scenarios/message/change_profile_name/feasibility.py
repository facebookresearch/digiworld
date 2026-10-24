# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for changing the profile name.

The verifier requires the name to differ from the current one
(name_was_different), so the user must not already have the new name.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint


class NameDiffersConstraint(Constraint):
    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        new_name = str(params.get("new_name") or "").strip().lower()
        try:
            row = conn.execute("SELECT name FROM users WHERE id = 1").fetchone()
        except sqlite3.OperationalError:
            return False
        return bool(row) and (row[0] or "").strip().lower() != new_name

    def describe(self) -> str:
        return "NameDiffers(users.name != new_name)"


CONSTRAINTS = [NameDiffersConstraint()]
