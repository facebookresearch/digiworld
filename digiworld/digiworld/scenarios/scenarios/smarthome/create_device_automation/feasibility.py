# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for create device automation scenario.

The target device is injected via additional mockdata, but rooms must
already exist so the device record's room reference is valid.
"""

from digiworld.scenarios.scenarios.smarthome.shared import ROOMS_EXIST

CONSTRAINTS = [ROOMS_EXIST]
