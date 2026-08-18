# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for showing the full credit card number.

Requires at least 1 active credit card for the user.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="credit_cards",
        user_filter=True,
        min_count=1,
        filter={"status": "active"},
    ),
]
