# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.constraints import MaxCountConstraint

CONSTRAINTS = [
    MaxCountConstraint(table="addresses", max_count=2, user_filter=True),
]
