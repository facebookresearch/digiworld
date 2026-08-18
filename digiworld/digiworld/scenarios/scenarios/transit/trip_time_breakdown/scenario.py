# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Verify that the agent correctly reports a time breakdown from trip details."""

import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

OPTIMIZATION_TO_TAG = {
    "fastest": "fastest",
    "cheapest": "lowest-cost",
    "most direct": "fewest-transfers",
    "least connections": "fewest-transfers",
}

VALID_TIME_TYPES = {
    "total walking time",
    "total transit time",
    "total non-walking time",
}


class TripTimeBreakdownScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports a time breakdown from trip details."""

    def _get_checks(self, state_path):
        stop_1 = getattr(self, "stop_1", None)
        stop_2 = getattr(self, "stop_2", None)
        time_param = getattr(self, "time", None)
        optimization = getattr(self, "optimization", None)
        time_type = getattr(self, "time_type", None)

        if not stop_1:
            raise ValueError("stop_1 parameter is required")
        if not stop_2:
            raise ValueError("stop_2 parameter is required")
        if not time_param:
            raise ValueError("time parameter is required")
        if not optimization:
            raise ValueError("optimization parameter is required")
        if not time_type:
            raise ValueError("time_type parameter is required")
        if time_type not in VALID_TIME_TYPES:
            raise ValueError(f"Unsupported time_type: '{time_type}'")

        tag = OPTIMIZATION_TO_TAG.get(optimization)
        if not tag:
            raise ValueError(f"Unsupported optimization: '{optimization}'")

        generated_route = self._get_generated_route_for_optimization(
            state_path, optimization
        )
        if generated_route and generated_route.get("segments"):
            segments = generated_route["segments"]
            if time_type == "total walking time":
                expected_minutes = sum(
                    segment.get("duration", 0)
                    for segment in segments
                    if segment.get("mode", {}).get("type") == "walk"
                )
            else:
                transit_minutes = sum(
                    segment.get("duration", 0)
                    for segment in segments
                    if segment.get("mode", {}).get("type") != "walk"
                )
                expected_minutes = transit_minutes

            logger.info(
                "Expected %s from generated route: %d minutes, agent answer: %r",
                time_type,
                expected_minutes,
                self.agent_answer,
            )
            return {"answer_matches": numeric_match(self.agent_answer, expected_minutes)}

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
            "SELECT id, departure_time FROM trip_options "
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
        trip_option_id = best[0]

        step_rows = self._execute_query_in_path(
            "SELECT type, duration_minutes FROM trip_steps "
            "WHERE trip_option_id = ?",
            (trip_option_id,),
            state_path,
        )
        if not step_rows:
            raise ValueError(
                f"No trip steps found for trip option '{trip_option_id}'"
            )

        if time_type == "total walking time":
            expected_minutes = sum(d for t, d in step_rows if t == "walk")
        elif time_type == "total transit time":
            expected_minutes = sum(d for t, d in step_rows if t == "ride")
        else:  # "total non-walking time"
            expected_minutes = sum(d for t, d in step_rows if t != "walk")

        logger.info(
            "Expected %s: %d minutes, agent answer: %r",
            time_type,
            expected_minutes,
            self.agent_answer,
        )
        return {"answer_matches": numeric_match(self.agent_answer, expected_minutes)}
