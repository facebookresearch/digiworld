# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Set my <account_name> account as the primary account'.

Since we inject the target account via mockdata, we only need the user to exist.
The account_record template uses ``{{past_timestamp}}`` which is a base template
and does not require positioning data.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="accounts",
        user_filter=True,
        min_count=1,
    ),
]
