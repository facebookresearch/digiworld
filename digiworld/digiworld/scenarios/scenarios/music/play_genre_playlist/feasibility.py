# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for playing songs of a genre.

The verifier looks the genre up in categories (case-insensitive); the profile
must have that category and songs to play.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint, EntityExistsConstraint


class GenreExistsConstraint(Constraint):
    """The genre named by the instance is one of the profile's categories."""

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        try:
            row = conn.execute(
                "SELECT COUNT(*) FROM categories WHERE LOWER(name) = LOWER(?)",
                (str(params.get("genre") or ""),),
            ).fetchone()
        except sqlite3.OperationalError:
            return False
        return bool(row and row[0])

    def describe(self) -> str:
        return "GenreExists(categories.name = genre)"


CONSTRAINTS = [
    EntityExistsConstraint(table="categories", min_count=1),
    EntityExistsConstraint(table="songs", min_count=1),
    GenreExistsConstraint(),
]
