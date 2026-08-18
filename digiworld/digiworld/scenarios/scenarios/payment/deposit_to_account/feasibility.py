# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for deposit_to_account.

Requires at least one active wallet for the current user so the deposit
has a target wallet.  Frozen wallets are excluded.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="wallets",
        user_filter=True,
        filter={"status": "active"},
        min_count=1,
    ),
]
