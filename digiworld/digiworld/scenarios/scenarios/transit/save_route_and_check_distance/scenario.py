"""Composed scenario: save a trip route then report its distance."""

import math
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine distance in km -- mirrors the app's calculateDistance()."""
    R = 6371.0
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(d_lon / 2) ** 2
    )
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class SaveRouteAndCheckDistanceScenario(TransitScenario, ComposableScenario):
    """Verify that the agent saved a route and correctly reported its distance.

    Combines save_trip_route (route exists in saved_routes)
    + saved_route_distance (agent's answer matches haversine distance).
    """

    def _get_checks(self, state_path):
        route_title = getattr(self, "route_title", None)
        if not route_title:
            raise ValueError("route_title parameter is required")

        # Check 1: route was saved
        count_query = "SELECT COUNT(*) FROM saved_routes WHERE name LIKE ?"
        count_rows = self._execute_query_in_path(
            count_query, (f"%{route_title}%",), state_path
        )
        route_saved = (count_rows[0][0] if count_rows else 0) > 0

        # Check 2: distance answer matches
        route_query = (
            "SELECT origin_stop_id, destination_stop_id "
            "FROM saved_routes WHERE name LIKE ?"
        )
        route_rows = self._execute_query_in_path(
            route_query, (f"%{route_title}%",), state_path
        )

        if not route_rows:
            logger.warning(
                "No saved route found with title %r in %s",
                route_title, state_path,
            )
            return {"route_saved": False, "answer_matches": False}

        origin_id, dest_id = route_rows[0]

        stop_query = "SELECT latitude, longitude FROM stops WHERE id = ?"
        origin_rows = self._execute_query_in_path(
            stop_query, (origin_id,), state_path
        )
        dest_rows = self._execute_query_in_path(
            stop_query, (dest_id,), state_path
        )
        if not origin_rows or not dest_rows:
            logger.warning(
                "Could not find coordinates for stops %s / %s in %s",
                origin_id, dest_id, state_path,
            )
            return {"route_saved": route_saved, "answer_matches": False}

        expected_km = _haversine_km(
            origin_rows[0][0], origin_rows[0][1],
            dest_rows[0][0], dest_rows[0][1],
        )

        logger.info(
            "Route '%s': haversine=%.3f km, agent answer: %r",
            route_title, expected_km, self.agent_answer,
        )

        return {
            "route_saved": route_saved,
            "answer_matches": float_match(
                self.agent_answer, expected_km, tolerance=0.5
            ),
        }
