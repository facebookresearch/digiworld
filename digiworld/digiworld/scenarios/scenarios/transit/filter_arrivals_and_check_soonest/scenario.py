# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: filter Live Arrivals by direction then report soonest bus."""

import datetime
import json
import logging
import os
from typing import Dict

from digiworld.scenarios.answer_matchers import time_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

DIRECTION_MAP = {
    "outbound": "out",
    "inbound": "in",
}

DIRECTION_FILTER_MAP = {
    "all": "all",
    "outbound": "out",
    "inbound": "in",
}


class FilterArrivalsAndCheckSoonestScenario(TransitScenario, ComposableScenario):
    """Verify the agent navigated to Live Arrivals with a direction filter,
    then correctly reported the soonest bus.

    Combines live_arrivals_direction_filter (on stop schedule page with
    correct direction filter) + soonest_bus_at_stop (agent answer matches
    the expected soonest arrival time).
    """

    def _get_reference_time(self) -> str:
        reference_time = getattr(self, "reference_time", None)
        if reference_time:
            return reference_time

        adb = getattr(self, "adb", None)
        backend = getattr(adb, "backend", None) if adb else None
        if backend and hasattr(backend, "run_shell_with_output"):
            try:
                device_time = backend.run_shell_with_output("date +%H:%M")
                if device_time:
                    return device_time.strip()
            except Exception as exc:
                logger.debug("Failed to read device time: %s", exc)

        return datetime.datetime.now().strftime("%H:%M")

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: verify direction filter on stop schedule page ---
        direction_filter = getattr(self, "direction_filter", None)
        if not direction_filter:
            raise ValueError("direction_filter parameter is required")

        expected_dir = DIRECTION_FILTER_MAP.get(direction_filter.lower())
        if expected_dir is None:
            raise ValueError(
                f"Unknown direction_filter '{direction_filter}'. "
                f"Valid values: {list(DIRECTION_FILTER_MAP.keys())}"
            )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        on_schedule = False
        correct_direction = False

        if os.path.exists(rootstore_path):
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)

            current_session = self.get_current_session(rootstore)
            if current_session:
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
                correct_direction = actual_dir == expected_dir

        # --- Part 2: verify soonest bus answer ---
        direction = getattr(self, "direction", None)
        stop_name = getattr(self, "stop_name", None)
        line_name = getattr(self, "line_name", None)

        if not direction or not stop_name or not line_name:
            raise ValueError(
                "direction, stop_name, and line_name parameters are required"
            )

        db_direction = DIRECTION_MAP.get(direction.lower())
        if db_direction is None:
            raise ValueError(
                f"Unknown direction '{direction}'. "
                f"Valid values: {list(DIRECTION_MAP.keys())}"
            )

        rows = self._execute_query_in_path(
            "SELECT id FROM stops WHERE name = ?",
            (stop_name,),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(f"No stop found with name '{stop_name}'")
        stop_id = rows[0][0]

        rows = self._execute_query_in_path(
            "SELECT id FROM lines WHERE name = ?",
            (line_name,),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(f"No line found with name '{line_name}'")
        line_id = rows[0][0]

        rows = self._execute_query_in_path(
            "SELECT schedule_data, departure_time FROM vehicles "
            "WHERE line_id = ? AND direction = ? AND status = 'active'",
            (line_id, db_direction),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(
                f"No active vehicles for line '{line_name}' "
                f"direction '{direction}'"
            )

        reference_time = self._get_reference_time()
        ref_hour, ref_min = (int(p) for p in reference_time.split(":"))
        ref_minutes = ref_hour * 60 + ref_min

        candidate_times: list[datetime.time] = []
        for schedule_json, _ in rows:
            schedule = json.loads(schedule_json)
            if isinstance(schedule, str):
                schedule = json.loads(schedule)
            for entry in schedule:
                if entry["stopId"] == stop_id:
                    h, m = (int(p) for p in entry["arrivalTime"].split(":"))
                    if h * 60 + m >= ref_minutes:
                        candidate_times.append(datetime.time(h, m))

        if not candidate_times:
            raise ValueError(
                f"No arrivals at '{stop_name}' on '{line_name}' "
                f"({direction}) at or after {reference_time}"
            )

        expected_time = min(candidate_times)
        answer_matches = time_match(
            self.agent_answer, expected_time, tolerance_minutes=2
        )

        logger.info(
            "Filter arrivals + soonest: on_schedule=%s, correct_dir=%s, "
            "expected_time=%s, answer=%r, matches=%s",
            on_schedule, correct_direction, expected_time,
            self.agent_answer, answer_matches,
        )

        return {
            "on_stop_schedule": on_schedule,
            "correct_direction": correct_direction,
            "answer_matches": answer_matches,
        }
