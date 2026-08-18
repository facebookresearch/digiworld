# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Verify that the agent correctly reports the fare price for an optimized trip."""

import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

OPTIMIZATION_TO_TAG = {
    "fastest": "fastest",
    "cheapest": "lowest-cost",
    "most direct": "fewest-transfers",
    "least connections": "fewest-transfers",
}


class TripFarePriceScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports the fare for an optimized trip."""

    def _get_checks(self, state_path):
        stop_1 = getattr(self, "stop_1", None)
        stop_2 = getattr(self, "stop_2", None)
        time_param = getattr(self, "time", None)
        optimization = getattr(self, "optimization", None)

        if not stop_1:
            raise ValueError("stop_1 parameter is required")
        if not stop_2:
            raise ValueError("stop_2 parameter is required")
        if not time_param:
            raise ValueError("time parameter is required")
        if not optimization:
            raise ValueError("optimization parameter is required")

        tag = OPTIMIZATION_TO_TAG.get(optimization)
        if not tag:
            raise ValueError(f"Unsupported optimization: '{optimization}'")

        generated_route = self._get_generated_route_for_optimization(
            state_path, optimization
        )
        if generated_route and generated_route.get("totalFare") is not None:
            expected_fare = generated_route["totalFare"]
            logger.info(
                "Expected fare from generated route: %s, agent answer: %r",
                expected_fare,
                self.agent_answer,
            )
            return {"answer_matches": float_match(self.agent_answer, expected_fare)}

        rows = self._execute_query_in_path(
            "SELECT id FROM stops WHERE name = ?",
            (stop_1,),
            state_path,
        )
        if not rows:
            raise ValueError(f"No stop found with name '{stop_1}'")
        origin_id = rows[0][0]

        rows = self._execute_query_in_path(
            "SELECT id FROM stops WHERE name = ?",
            (stop_2,),
            state_path,
        )
        if not rows:
            raise ValueError(f"No stop found with name '{stop_2}'")
        dest_id = rows[0][0]

        rows = self._execute_query_in_path(
            "SELECT total_fare, departure_time FROM trip_options "
            "WHERE origin_stop_id = ? AND destination_stop_id = ? "
            "AND tags LIKE ?",
            (origin_id, dest_id, f"%{tag}%"),
            state_path,
        )
        if not rows:
            raise ValueError(
                f"No trip option found from '{stop_1}' to '{stop_2}' "
                f"with optimization '{optimization}'"
            )

        target_minutes = (
            int(time_param.split(":")[0]) * 60 + int(time_param.split(":")[1])
        )
        best = min(
            rows,
            key=lambda r: abs(
                int(r[1].split(":")[0]) * 60
                + int(r[1].split(":")[1])
                - target_minutes
            ),
        )

        expected_fare = best[0]
        logger.info(
            "Expected fare: %s, agent answer: %r",
            expected_fare,
            self.agent_answer,
        )
        return {"answer_matches": float_match(self.agent_answer, expected_fare)}
