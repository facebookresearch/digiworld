# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for deleting a playlist and playing a genre.

The genre must be one of the profile's categories (the playlist itself is
injected by the instance).
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
    EntityExistsConstraint(table="songs", min_count=1),
    GenreExistsConstraint(),
]
