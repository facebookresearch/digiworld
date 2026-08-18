# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for paying a bill with a credit card.

Requires an active credit card with available credit. The biller is
injected via mockdata, and at least 1 pending bill must exist.
"""

from digiworld.scenarios.constraints import (
    BalanceConstraint,
    DataVolumeConstraint,
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
        min_value=100.0,
        user_filter=True,
    ),
    DataVolumeConstraint(
        table="bills",
        user_filter=True,
        filter={"status": "pending"},
        min_count=1,
    ),
]
