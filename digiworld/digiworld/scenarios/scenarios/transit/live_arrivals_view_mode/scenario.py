# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for navigating to Live Arrivals and setting the view mode."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

VIEW_MODE_MAP = {
    "full day": True,
    "upcoming": False,
}


class LiveArrivalsViewModeScenario(TransitScenario, ComposableScenario):
    """Verify the user navigated to a stop schedule and set the correct view mode."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        view_mode = getattr(self, "view_mode", None)
        if not view_mode:
            raise ValueError("view_mode parameter is required")

        expected_full = VIEW_MODE_MAP.get(view_mode.lower())
        if expected_full is None:
            raise ValueError(
                f"Unknown view_mode '{view_mode}'. "
                f"Valid values: {list(VIEW_MODE_MAP.keys())}"
            )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {"on_stop_schedule": False, "correct_view_mode": False}

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_stop_schedule": False, "correct_view_mode": False}

        screen_name = current_session.get("data", {}).get("screenName", "").lower()
        route = current_session.get("data", {}).get("route", "").lower()

        on_schedule = (
            "stopschedule" in screen_name
            or "schedule" in screen_name
            or "/stops/" in route
            or "schedule" in route
        )

        schedule_state = (
            rootstore
            .get("stopScheduleStore", {})
            .get("stopScheduleState", {})
        )
        actual_full = schedule_state.get("showFullSchedule", None)

        correct_mode = actual_full is not None and actual_full == expected_full

        logger.info(
            "Stop schedule: %s, view_mode expected=%s (showFullSchedule=%s), "
            "actual=%s, matches=%s",
            on_schedule, view_mode, expected_full, actual_full, correct_mode,
        )
        return {
            "on_stop_schedule": on_schedule,
            "correct_view_mode": correct_mode,
        }
