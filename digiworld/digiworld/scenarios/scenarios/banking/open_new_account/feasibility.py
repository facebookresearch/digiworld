# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for opening a new bank account.

The requested account type must exist in the profile's account_types
table.  This is verified at instance generation time by filtering
compatible_profiles based on actual DB content.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="account_types", min_count=1),
]
