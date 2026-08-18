# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for saved route distance queries."""

from digiworld.scenarios.scenarios.transit.shared import (
    STOPS_EXIST,
    TRIP_OPTIONS_EXIST,
)

# SAVED_ROUTES_EXIST removed: the scenario now injects its own saved route via mockdata
CONSTRAINTS = [TRIP_OPTIONS_EXIST, STOPS_EXIST]
