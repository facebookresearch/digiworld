# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="songs", min_count=1),
]
