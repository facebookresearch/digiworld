# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'How much money was involved in my last transaction?'.

Requires at least one successful transaction for the current user.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(
        table="transactions",
        user_filter=True,
        filter={"status": "success"},
        min_count=1,
    ),
]
