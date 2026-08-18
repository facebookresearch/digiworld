# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Create a scene ... and add the <device_type>
device named "<device_name>"'.

The device is injected via additional mockdata, but it needs a room to exist
so that its roomId placeholder ({{first_room_id}}) resolves.
"""

from digiworld.scenarios.scenarios.smarthome.shared import ROOMS_EXIST

CONSTRAINTS = [ROOMS_EXIST]
