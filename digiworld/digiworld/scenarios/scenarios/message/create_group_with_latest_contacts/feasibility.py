# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'create_group_with_latest_contacts'.

Requires that user 1 has exchanged messages with at least 3 distinct contacts.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint


class DistinctContactsConstraint(Constraint):
    """Check that user 1 has messages with at least N distinct contacts."""

    def __init__(self, min_contacts: int = 3):
        self.min_contacts = min_contacts

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        query = (
            "SELECT COUNT(DISTINCT contact_id) FROM ("
            "  SELECT CASE WHEN sender_id = '1' THEN receiver_id "
            "  ELSE sender_id END AS contact_id "
            "  FROM messages "
            "  WHERE (sender_id = '1' OR receiver_id = '1') "
            "    AND (deleted_by IS NULL OR "
            "         (',' || REPLACE(deleted_by, ' ', '') || ',') NOT LIKE '%,1,%')"
            ")"
        )
        row = conn.execute(query).fetchone()
        return (row[0] if row else 0) >= self.min_contacts

    def describe(self) -> str:
        return f"DistinctContacts(min={self.min_contacts})"


CONSTRAINTS = [DistinctContactsConstraint(min_contacts=3)]