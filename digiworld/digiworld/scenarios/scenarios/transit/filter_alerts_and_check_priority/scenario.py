"""Composed scenario: filter Service Alerts by severity then report an alert's priority."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

VALID_SEVERITIES = {"all", "high", "medium", "low"}


class FilterAlertsAndCheckPriorityScenario(TransitScenario, ComposableScenario):
    """Verify the agent navigated to alerts with a severity filter, then
    reported the priority of a specific alert.

    Combines service_alerts_severity_filter (on alerts page with correct
    severity filter) + alert_priority (agent answer matches the alert's
    severity from the database).
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: verify severity filter on alerts page ---
        severity_filter = getattr(self, "severity_filter", None)
        if not severity_filter:
            raise ValueError("severity_filter parameter is required")

        expected_sev = severity_filter.lower()
        if expected_sev not in VALID_SEVERITIES:
            raise ValueError(
                f"Unknown severity_filter '{severity_filter}'. "
                f"Valid values: {sorted(VALID_SEVERITIES)}"
            )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        on_alerts_page = False
        correct_filter = False

        if os.path.exists(rootstore_path):
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)

            current_session = self.get_current_session(rootstore)
            if current_session:
                screen_name = current_session.get("data", {}).get("screenName", "").lower()
                route = current_session.get("data", {}).get("route", "").lower()

                on_alerts_page = "alert" in screen_name or "/alerts" in route

                alerts_state = (
                    rootstore
                    .get("alertsStore", {})
                    .get("alertsState", {})
                )
                actual_sev = alerts_state.get("selectedSeverity", "").lower()
                correct_filter = actual_sev == expected_sev

        # --- Part 2: verify alert priority answer ---
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
        answer_matches = substring_match(self.agent_answer, expected_severity)

        logger.info(
            "Filter alerts + priority: on_alerts=%s, correct_filter=%s, "
            "expected_severity=%s, answer=%r, matches=%s",
            on_alerts_page, correct_filter, expected_severity,
            self.agent_answer, answer_matches,
        )

        return {
            "on_alerts_page": on_alerts_page,
            "correct_filter": correct_filter,
            "answer_matches": answer_matches,
        }
