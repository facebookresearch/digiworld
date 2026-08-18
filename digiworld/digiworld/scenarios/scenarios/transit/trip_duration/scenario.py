# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Verify that the agent correctly reports the duration of a trip."""

import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class TripDurationScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports a valid trip duration."""

    def _get_checks(self, state_path):
        stop_1 = getattr(self, "stop_1", None)
        stop_2 = getattr(self, "stop_2", None)
        time_param = getattr(self, "time", None)

        if not stop_1:
            raise ValueError("stop_1 parameter is required")
        if not stop_2:
            raise ValueError("stop_2 parameter is required")
        if not time_param:
            raise ValueError("time parameter is required")

        generated_route = self._get_generated_route_for_optimization(state_path)
        if generated_route and generated_route.get("totalDuration") is not None:
            expected_duration = generated_route["totalDuration"]
            logger.info(
                "Expected duration from generated route: %s, agent answer: %r",
                expected_duration,
                self.agent_answer,
            )
            return {"answer_matches": numeric_match(self.agent_answer, expected_duration)}

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
            "SELECT total_duration_minutes FROM trip_options "
            "WHERE origin_stop_id = ? AND destination_stop_id = ?",
            (origin_id, dest_id),
            state_path,
        )
        if not rows:
            raise ValueError(
                f"No trip options found from '{stop_1}' to '{stop_2}'"
            )

        valid_durations = [row[0] for row in rows]
        logger.info(
            "Valid durations: %s, agent answer: %r",
            valid_durations,
            self.agent_answer,
        )
        matched = any(
            numeric_match(self.agent_answer, d) for d in valid_durations
        )
        return {"answer_matches": matched}
