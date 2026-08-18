# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for scheduling a payment with the credit card.

Requires an active credit card with available credit, and billers/bills
are injected via mockdata.
"""

from digiworld.scenarios.constraints import (
    BalanceConstraint,
    EntityExistsConstraint,
)

CONSTRAINTS = [
    EntityExistsConstraint(
        table="credit_cards",
        user_filter=True,
        min_count=1,
        filter={"status": "active"},
    ),
    BalanceConstraint(
        table="credit_cards",
        field="available_credit",
        min_value=300.0,
        user_filter=True,
    ),
]
