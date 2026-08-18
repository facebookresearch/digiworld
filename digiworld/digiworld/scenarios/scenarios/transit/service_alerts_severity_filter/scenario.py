# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for navigating to Service Alerts and setting the severity filter."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

VALID_SEVERITIES = {"all", "high", "medium", "low"}


class ServiceAlertsSeverityFilterScenario(TransitScenario, ComposableScenario):
    """Verify the user navigated to alerts and set the correct severity filter."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
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
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {"on_alerts_page": False, "correct_filter": False}

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_alerts_page": False, "correct_filter": False}

        screen_name = current_session.get("data", {}).get("screenName", "").lower()
        route = current_session.get("data", {}).get("route", "").lower()

        on_alerts = "alert" in screen_name or "/alerts" in route

        alerts_state = (
            rootstore
            .get("alertsStore", {})
            .get("alertsState", {})
        )
        actual_sev = alerts_state.get("selectedSeverity", "").lower()

        correct = actual_sev == expected_sev

        logger.info(
            "Alerts page: %s, severity expected='%s', actual='%s', matches=%s",
            on_alerts, expected_sev, actual_sev, correct,
        )
        return {
            "on_alerts_page": on_alerts,
            "correct_filter": correct,
        }
