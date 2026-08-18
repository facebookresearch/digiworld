# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for '<question> the <room_name> room?'."""

from digiworld.scenarios.constraints import EntityExistsConstraint
from digiworld.scenarios.scenarios.smarthome.shared import ROOMS_EXIST

CONSTRAINTS = [
    ROOMS_EXIST,
    EntityExistsConstraint(table="devices", user_filter=True, min_count=1),
]
