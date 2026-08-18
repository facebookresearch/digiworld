# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CityConnectorStopNumberScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports a stop's sequence on the City Connector."""

    def _get_checks(self, state_path):
        stop_name = getattr(self, "stop_name", None)
        line_name = getattr(self, "line_name", None) or "City Connector"
        if not stop_name:
            raise ValueError("stop_name parameter is required")

        query = (
            "SELECT ls.sequence "
            "FROM line_stops ls "
            "JOIN stops s ON ls.stop_id = s.id "
            "JOIN lines l ON ls.line_id = l.id "
            "WHERE l.name = ? AND s.name = ?"
        )
        rows = self._execute_query_in_path(
            query, (line_name, stop_name), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No stop '{stop_name}' found on the '{line_name}' line"
            )

        expected_seq = rows[0][0]
        logger.info(
            f"Expected sequence number: {expected_seq}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": numeric_match(self.agent_answer, expected_seq)}
