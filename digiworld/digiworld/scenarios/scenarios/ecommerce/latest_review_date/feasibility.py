# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.constraints import DataVolumeConstraint

CONSTRAINTS = [
    DataVolumeConstraint(table="reviews", min_count=3),
]
