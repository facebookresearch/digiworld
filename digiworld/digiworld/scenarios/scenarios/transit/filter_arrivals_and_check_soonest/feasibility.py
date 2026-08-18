# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for filter_arrivals_and_check_soonest."""

from digiworld.scenarios.scenarios.transit.shared import (
    LINES_EXIST,
    STOPS_EXIST,
    VEHICLES_EXIST,
)

CONSTRAINTS = [LINES_EXIST, STOPS_EXIST, VEHICLES_EXIST]
