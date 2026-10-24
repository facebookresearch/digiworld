# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for adding a saved address.

The app allows at most 3 addresses per user ('Maximum 3 addresses allowed'),
so the profile must start with at most 2.
"""

from digiworld.scenarios.constraints import MaxCountConstraint

CONSTRAINTS = [
    MaxCountConstraint(table="addresses", max_count=2, user_filter=True),
]
