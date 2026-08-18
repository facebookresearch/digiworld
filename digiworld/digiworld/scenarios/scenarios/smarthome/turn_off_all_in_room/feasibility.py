# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Turn off all devices, automations, and
scenes in the room "<room_name>"'.

The target room and devices are injected via mockdata.  The profile must
already contain scenes and automations so there is something to deactivate.
"""

from digiworld.scenarios.scenarios.smarthome.shared import (
    AUTOMATIONS_EXIST,
    SCENES_EXIST,
)

CONSTRAINTS = [SCENES_EXIST, AUTOMATIONS_EXIST]
