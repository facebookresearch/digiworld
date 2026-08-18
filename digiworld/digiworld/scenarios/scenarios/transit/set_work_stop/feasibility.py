# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Set Work Stop to <stop_name>'."""

from digiworld.scenarios.scenarios.transit.shared import (
    STOPS_EXIST,
    USER_PREFERENCES_EXIST,
)

CONSTRAINTS = [USER_PREFERENCES_EXIST, STOPS_EXIST]
