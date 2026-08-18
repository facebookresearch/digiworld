# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'How many listings have I sold'."""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="items", min_count=1, filter={"seller_id": 1, "status": "sold"}
    ),
]
