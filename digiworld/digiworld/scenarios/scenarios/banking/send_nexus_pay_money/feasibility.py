# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for sending Nexus Pay money.

The user must have an account with sufficient balance for the transfer.
Accounts and contacts are injected via mockdata.
"""

from digiworld.scenarios.constraints import BalanceConstraint

CONSTRAINTS = [
    BalanceConstraint(
        table="accounts",
        field="available_balance",
        min_value=5.0,
        user_filter=True,
    ),
]
