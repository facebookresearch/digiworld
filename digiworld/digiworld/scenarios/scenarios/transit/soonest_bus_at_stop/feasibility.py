# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for soonest bus at stop queries."""

from digiworld.scenarios.scenarios.transit.shared import (
    LINES_EXIST,
    STOPS_EXIST,
    VEHICLES_EXIST,
)

CONSTRAINTS = [LINES_EXIST, STOPS_EXIST, VEHICLES_EXIST]
