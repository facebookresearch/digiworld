# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Check <transaction_type> transactions'."""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="transactions", min_count=1),
]
