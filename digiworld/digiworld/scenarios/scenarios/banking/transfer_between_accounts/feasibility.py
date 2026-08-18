# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Transfer <amount> from <account_1> to <account_2>'.

Since we inject both source and destination accounts via mockdata with known
balances, we only need the user to exist. The account_record template uses
``{{past_timestamp}}`` which is a base template and does not require positioning
data.
"""

from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="accounts",
        user_filter=True,
        min_count=1,
    ),
]
