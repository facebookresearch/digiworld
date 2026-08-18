# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'View details of transaction <description>'.

The template resolver computes positioned timestamps against the
transactions table, filtering by user_id and status='success'.
At least 2 matching rows are required for positioning.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="transactions",
        user_filter=True,
        filter={"status": "success"},
        min_count=2,
    ),
]
