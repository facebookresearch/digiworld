# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class OperatingFrequencyOfLineScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports a transit line's frequency."""

    def _get_checks(self, state_path):
        line_name = getattr(self, "line_name", None)
        if not line_name:
            raise ValueError("line_name parameter is required")

        query = "SELECT frequency_minutes FROM lines WHERE name = ?"
        rows = self._execute_query_in_path(
            query, (line_name,), self.initial_state_path
        )

        if not rows:
            raise ValueError(f"No line found with name '{line_name}'")

        expected_freq = rows[0][0]
        logger.info(
            f"Expected frequency: {expected_freq} minutes, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": numeric_match(self.agent_answer, expected_freq)}
