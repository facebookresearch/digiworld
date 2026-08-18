# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for add Nexus Pay contact and pay.

The user must have at least one account with sufficient balance to fund
the $5 payment.
"""

from digiworld.scenarios.constraints import BalanceConstraint, EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="accounts",
        user_filter=True,
        min_count=1,
    ),
    BalanceConstraint(
        table="accounts",
        field="available_balance",
        min_value=5.0,
        user_filter=True,
    ),
]
