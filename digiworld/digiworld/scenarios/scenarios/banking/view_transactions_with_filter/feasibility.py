# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'View all transactions, then filter by <filter_type>'.

Requires at least 1 transaction for the current user.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="transactions",
        user_filter=True,
        min_count=1,
    ),
]
