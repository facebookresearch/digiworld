# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for transfer-and-check-balance.

Same as transfer_between_accounts: we inject both accounts via mockdata,
so we only need at least one existing account (proves the user exists).
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="accounts",
        user_filter=True,
        min_count=1,
    ),
]
