# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for paying the most/least expensive pending bill.

Requires at least one user account to pay from. Billers and pending
bills are injected via mockdata.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="accounts",
        user_filter=True,
        min_count=1,
    ),
]
