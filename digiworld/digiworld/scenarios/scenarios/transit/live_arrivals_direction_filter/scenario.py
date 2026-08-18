# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for navigating to Live Arrivals and setting the direction filter."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

DIRECTION_MAP = {
    "all": "all",
    "outbound": "out",
    "inbound": "in",
}


class LiveArrivalsDirectionFilterScenario(TransitScenario, ComposableScenario):
    """Verify the user navigated to a stop schedule and set the correct direction filter."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        direction_filter = getattr(self, "direction_filter", None)
        if not direction_filter:
            raise ValueError("direction_filter parameter is required")

        expected_dir = DIRECTION_MAP.get(direction_filter.lower())
        if expected_dir is None:
            raise ValueError(
                f"Unknown direction_filter '{direction_filter}'. "
                f"Valid values: {list(DIRECTION_MAP.keys())}"
            )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {"on_stop_schedule": False, "correct_direction": False}

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_stop_schedule": False, "correct_direction": False}

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
        actual_dir = schedule_state.get("selectedDirection", "")

        correct = actual_dir == expected_dir

        logger.info(
            "Stop schedule: %s, direction expected='%s', actual='%s', matches=%s",
            on_schedule, expected_dir, actual_dir, correct,
        )
        return {
            "on_stop_schedule": on_schedule,
            "correct_direction": correct,
        }
