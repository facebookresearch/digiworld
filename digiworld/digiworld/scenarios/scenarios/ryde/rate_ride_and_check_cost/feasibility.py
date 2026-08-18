# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Rate ride and check cost'.

Requires at least one completed ride for both the rating and the cost query.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="rides", user_filter=True, min_count=1,
        filter={"status": "completed"},
    ),
]
