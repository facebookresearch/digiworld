# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for set_home_and_work_stop."""

from digiworld.scenarios.scenarios.transit.shared import (
    STOPS_EXIST,
    USER_PREFERENCES_EXIST,
)

CONSTRAINTS = [USER_PREFERENCES_EXIST, STOPS_EXIST]
