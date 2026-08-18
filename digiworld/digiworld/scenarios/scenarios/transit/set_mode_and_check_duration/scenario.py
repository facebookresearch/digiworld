# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: set preferred transit mode then report trip duration."""

import json
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetModeAndCheckDurationScenario(TransitScenario, ComposableScenario):
    """Verify the agent set the preferred mode and reported a trip duration.

    Combines set_preferred_mode (preferred_modes in user_preferences updated)
    + trip_duration (agent answer matches a valid trip duration).
    """

    def _parse_modes(self, raw):
        if not raw:
            return set()

        parsed = raw
        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except json.JSONDecodeError:
                return {parsed}

        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except json.JSONDecodeError:
                return {parsed}

        if isinstance(parsed, list):
            return {mode for mode in parsed if isinstance(mode, str)}

        return set()

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: verify preferred mode ---
        query = (
            "SELECT preferred_modes FROM user_preferences WHERE user_id = ?"
        )
        rows = self._execute_query_in_path(query, (1,), state_path)

        if not rows:
            raise ValueError(
                "No user_preferences record found for user_id=1"
            )

        raw = rows[0][0]
        actual_modes = self._parse_modes(raw)

        if " and " in self.mode:
            expected_modes = set(self.mode.split(" and "))
        else:
            expected_modes = {self.mode}

        preferred_modes_match = actual_modes == expected_modes

        logger.info(
            "Preferred mode check: expected=%s, actual=%s, matches=%s",
            sorted(expected_modes), sorted(actual_modes), preferred_modes_match,
        )

        # --- Part 2: verify trip duration answer ---
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
                expected_duration, self.agent_answer,
            )
            answer_matches = numeric_match(self.agent_answer, expected_duration)
        else:
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
                valid_durations, self.agent_answer,
            )
            answer_matches = any(
                numeric_match(self.agent_answer, d) for d in valid_durations
            )

        return {
            "preferred_modes_match": preferred_modes_match,
            "answer_matches": answer_matches,
        }
