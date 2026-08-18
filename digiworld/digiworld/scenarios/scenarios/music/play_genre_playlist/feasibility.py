# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(table="categories", min_count=1),
    EntityExistsConstraint(table="songs", min_count=1),
]
