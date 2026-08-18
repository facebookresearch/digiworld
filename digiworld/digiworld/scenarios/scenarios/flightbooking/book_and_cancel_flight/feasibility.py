# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'book_and_cancel_flight'.

Requires airports to exist (for booking).
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="airports", min_count=1),
]
