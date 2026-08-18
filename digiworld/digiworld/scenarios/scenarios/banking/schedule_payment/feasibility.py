# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for scheduling a payment.

Requires at least 3 billers and at least 1 user account.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="billers",
        min_count=3,
    ),
    EntityExistsConstraint(
        table="accounts",
        user_filter=True,
        min_count=1,
    ),
]
