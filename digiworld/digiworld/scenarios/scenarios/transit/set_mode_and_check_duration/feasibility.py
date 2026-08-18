# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for set_mode_and_check_duration."""

from digiworld.scenarios.scenarios.transit.shared import (
    USER_PREFERENCES_EXIST,
    TRIP_OPTIONS_EXIST,
)

CONSTRAINTS = [USER_PREFERENCES_EXIST, TRIP_OPTIONS_EXIST]
