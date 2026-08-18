# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for counting payees in a category.

Requires enough active billers to ensure variety across categories.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="billers",
        min_count=3,
    ),
]
