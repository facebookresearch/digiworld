# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for '<action> all of my <item_type>'.

Requires devices, scenes, and automations to already exist in the profile
so that any action/item_type combination has items to toggle.
"""

from digiworld.scenarios.scenarios.smarthome.shared import (
    AUTOMATIONS_EXIST,
    DEVICES_EXIST,
    SCENES_EXIST,
)

CONSTRAINTS = [DEVICES_EXIST, SCENES_EXIST, AUTOMATIONS_EXIST]
