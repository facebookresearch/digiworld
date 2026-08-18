# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AlertAlternativesScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports recommended alternatives for a service alert."""

    def _get_checks(self, state_path):
        alert_title = getattr(self, "alert_title", None)
        if not alert_title:
            raise ValueError("alert_title parameter is required")

        query = "SELECT recommended_alternatives FROM service_alerts WHERE title = ?"
        rows = self._execute_query_in_path(
            query, (alert_title,), self.initial_state_path
        )

        if not rows:
            raise ValueError(f"No service alert found with title '{alert_title}'")

        raw = rows[0][0]
        alternatives = json.loads(raw) if isinstance(raw, str) else raw

        if not alternatives:
            raise ValueError(
                f"Service alert '{alert_title}' has no recommended alternatives"
            )

        logger.info(
            f"Expected alternatives: {alternatives}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": all_substrings_match(self.agent_answer, alternatives)
        }
