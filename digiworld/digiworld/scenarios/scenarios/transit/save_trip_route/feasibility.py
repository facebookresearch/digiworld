# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for saving a trip route."""

from digiworld.scenarios.scenarios.transit.shared import (
    STOPS_EXIST,
    TRIP_OPTIONS_EXIST,
)

CONSTRAINTS = [TRIP_OPTIONS_EXIST, STOPS_EXIST]
