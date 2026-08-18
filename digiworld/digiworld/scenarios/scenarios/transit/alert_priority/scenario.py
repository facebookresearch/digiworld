# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AlertPriorityScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports a service alert's priority."""

    def _get_checks(self, state_path):
        alert_title = getattr(self, "alert_title", None)
        if not alert_title:
            raise ValueError("alert_title parameter is required")

        query = "SELECT severity FROM service_alerts WHERE title = ?"
        rows = self._execute_query_in_path(
            query, (alert_title,), self.initial_state_path
        )

        if not rows:
            raise ValueError(f"No service alert found with title '{alert_title}'")

        expected_severity = rows[0][0]
        logger.info(
            f"Expected severity: {expected_severity}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": substring_match(self.agent_answer, expected_severity)}
