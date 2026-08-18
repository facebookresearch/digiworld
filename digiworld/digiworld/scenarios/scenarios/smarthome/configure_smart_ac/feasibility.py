# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'configure_smart_ac'.

Requires at least one room to exist so the injected device can be assigned.
"""

from digiworld.scenarios.scenarios.smarthome.shared import ROOMS_EXIST

CONSTRAINTS = [ROOMS_EXIST]
