"""Feasibility constraints for save_route_and_check_distance."""

from digiworld.scenarios.scenarios.transit.shared import (
    STOPS_EXIST,
    TRIP_OPTIONS_EXIST,
)

CONSTRAINTS = [TRIP_OPTIONS_EXIST, STOPS_EXIST]
