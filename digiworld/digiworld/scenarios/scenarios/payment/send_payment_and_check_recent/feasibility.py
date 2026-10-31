# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for sending a payment of <amount>.

The app pays from the user's first active wallet and refuses a payment larger
than its balance (useTransaction: activeWallets[0]). If the profile gives the
user an active wallet, the first one must hold at least the amount; a user
without one gets the wallet the instance injects.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint


class FirstWalletCoversAmountConstraint(Constraint):
    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        try:
            amount = float(params.get("amount") or 0)
            row = conn.execute(
                "SELECT balance FROM wallets WHERE user_id = 1 AND status = 'active' ORDER BY id LIMIT 1"
            ).fetchone()
        except (ValueError, sqlite3.OperationalError):
            return False
        return row is None or float(row[0]) >= amount

    def describe(self) -> str:
        return "FirstWalletCoversAmount(amount)"


CONSTRAINTS = [FirstWalletCoversAmountConstraint()]
