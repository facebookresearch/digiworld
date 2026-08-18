# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for paying a payee.

A biller must exist, and positioning data requires prior transactions.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint, EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="billers",
        min_count=1,
    ),
    DataVolumeConstraint(
        table="transactions",
        user_filter=True,
        filter={"status": "success"},
        min_count=2,
    ),
]
