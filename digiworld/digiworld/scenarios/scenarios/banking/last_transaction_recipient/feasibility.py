# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Who was my last transaction towards?'.

Requires at least one successful outgoing transaction (category 'debit' or
'transfer') for user 1.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint


class OutgoingTransactionConstraint(Constraint):
    """Check that user 1 has at least ``min_count`` successful outgoing transactions."""

    def __init__(self, min_count: int = 1):
        self.min_count = min_count

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        query = (
            "SELECT COUNT(*) FROM transactions t "
            "JOIN transaction_types tt ON t.transaction_type_id = tt.id "
            "WHERE t.user_id = 1 "
            "AND t.status = 'success' "
            "AND tt.category IN ('debit', 'transfer')"
        )
        try:
            row = conn.execute(query).fetchone()
            return (row[0] if row else 0) >= self.min_count
        except sqlite3.OperationalError:
            return False

    def describe(self) -> str:
        return f"OutgoingTransaction(min={self.min_count})"


CONSTRAINTS = [OutgoingTransactionConstraint(min_count=1)]
