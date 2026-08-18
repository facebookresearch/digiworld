# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for payee with extreme average bill.

Requires enough active billers to ensure coverage across categories.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="billers",
        min_count=8,
    ),
]
