# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import logging

from digiworld.scenarios.answer_matchers import date_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AlertPostedDateScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports when a service alert was posted."""

    def _get_checks(self, state_path):
        alert_title = getattr(self, "alert_title", None)
        if not alert_title:
            raise ValueError("alert_title parameter is required")

        query = "SELECT created_at FROM service_alerts WHERE title = ?"
        rows = self._execute_query_in_path(
            query, (alert_title,), self.initial_state_path
        )

        if not rows:
            raise ValueError(f"No service alert found with title '{alert_title}'")

        raw_date = rows[0][0]
        expected_date = datetime.datetime.fromisoformat(
            raw_date.replace("Z", "+00:00")
        ).date()
        logger.info(
            f"Expected alert posted date: {expected_date}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": date_match(self.agent_answer, expected_date)}
