# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for pending bills in category.

The user must have enough bills to ensure variety across categories.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="bills",
        user_filter=True,
        min_count=3,
    ),
]
