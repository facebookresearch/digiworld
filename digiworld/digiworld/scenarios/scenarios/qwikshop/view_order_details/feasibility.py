# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'View details of order <order_number>'.

The template resolver computes a positioned timestamp that requires at
least 2 orders belonging to the current user.
"""

from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(table="orders", user_filter=True, min_count=2),
]
