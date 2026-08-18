# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(table="transactions", min_count=1),
]
