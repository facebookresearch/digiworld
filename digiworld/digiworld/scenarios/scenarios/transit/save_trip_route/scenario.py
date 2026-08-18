# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SaveTripRouteScenario(TransitScenario, ComposableScenario):
    """Verify that the agent saved a route with the expected title."""

    def _get_checks(self, state_path):
        route_title = getattr(self, "route_title", None)
        if not route_title:
            raise ValueError("route_title parameter is required")

        query = "SELECT COUNT(*) FROM saved_routes WHERE name LIKE ?"
        rows = self._execute_query_in_path(
            query, (f"%{route_title}%",), state_path
        )

        count = rows[0][0] if rows else 0
        logger.info(
            f"Saved route check: title={route_title!r}, count={count}"
        )
        return {"route_saved": count > 0}
