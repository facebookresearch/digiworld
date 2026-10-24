# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for paying a bill and checking credit card info.

Requires an active credit card (its details are what the task asks about).
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
