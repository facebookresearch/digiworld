# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Show me transactions filtered by <filter_type> and by the date range of <date_range>'."""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="transactions", min_count=1),
]
