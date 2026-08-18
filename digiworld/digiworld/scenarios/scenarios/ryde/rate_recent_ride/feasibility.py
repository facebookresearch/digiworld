# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Rate the most recent completed ride'.

Requires at least 1 completed ride for the current user as defense-in-depth.
The instance mockdata injects an additional completed ride (with
feedback_submitted=0), but if injection fails, this constraint ensures
the profile already has a completed ride.  The positioning service's
own min-row requirement (2 rows total in the rides table) is auto-derived
from the mockdata templates and does not need to be repeated here.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="rides", user_filter=True, min_count=1,
        filter={"status": "completed"},
    ),
]
