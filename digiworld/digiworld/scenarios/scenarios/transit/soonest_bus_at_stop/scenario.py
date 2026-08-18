# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import json
import logging

from digiworld.scenarios.answer_matchers import time_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

DIRECTION_MAP = {
    "outbound": "out",
    "inbound": "in",
}

class SoonestBusAtStopScenario(TransitScenario, ComposableScenario):
    """Verify the agent reports the soonest bus at a stop in a given direction."""

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

    def _get_checks(self, state_path):
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
            # Handle double-serialized JSON (string inside string)
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
        logger.info(
            "Expected soonest bus after %s: %s, agent answer: %r",
            reference_time, expected_time, self.agent_answer,
        )
        return {
            "answer_matches": time_match(
                self.agent_answer, expected_time, tolerance_minutes=2
            )
        }
