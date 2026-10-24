# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for credit card application.

The app enforces a per-user credit card limit that depends on the user's
account tier (BankingStore.canApplyForCreditCard: everyday 1, premier 2,
sapphire 3, any other tier 1, counting active cards). Profiles where the user
is already at the limit cannot create a new card, so they must be excluded.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint

# Mirrors tierLimits in apps/banking/src/models/BankingStore.ts.
TIER_CARD_LIMITS = {"everyday": 1, "premier": 2, "sapphire": 3}


class CreditCardCapacityConstraint(Constraint):
    """User 1 has fewer active credit cards than their tier allows."""

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        try:
            row = conn.execute(
                "SELECT t.code, "
                "(SELECT COUNT(*) FROM credit_cards c WHERE c.user_id = u.id AND c.status = 'active') "
                "FROM users u JOIN account_tier_levels t ON t.id = u.account_tier_id "
                "WHERE u.id = 1"
            ).fetchone()
        except sqlite3.OperationalError:
            return False
        if not row:
            return False
        tier_code, active_cards = row
        return active_cards < TIER_CARD_LIMITS.get(tier_code, 1)

    def describe(self) -> str:
        return "CreditCardCapacity(active cards < tier limit)"


CONSTRAINTS = [CreditCardCapacityConstraint()]
