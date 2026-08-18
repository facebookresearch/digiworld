# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Book a one-way flight'."""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="airports", min_count=1),
]
