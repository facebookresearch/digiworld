# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="wallets", user_filter=True, min_count=1),
]
