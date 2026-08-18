# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import json
import logging

from digiworld.scenarios.answer_matchers import time_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class StopScheduleExtremeArrivalScenario(TransitScenario, ComposableScenario):
    """Verify the agent reports the earliest or latest arrival at a stop."""

    def _get_checks(self, state_path):
        stop_name = getattr(self, "stop_name", None)
        extreme_type = getattr(self, "extreme_type", None)
        if not stop_name or not extreme_type:
            raise ValueError(
                "stop_name and extreme_type parameters are required"
            )

        if extreme_type.lower() not in ("earliest", "latest"):
            raise ValueError(
                f"Unknown extreme_type '{extreme_type}'. "
                f"Valid values: earliest, latest"
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
            "SELECT schedule_data FROM vehicles WHERE status = 'active'",
            (),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError("No active vehicles found")

        arrival_times: list[datetime.time] = []
        for (schedule_json,) in rows:
            schedule = json.loads(schedule_json)
            # Handle double-serialized JSON (string inside string)
            if isinstance(schedule, str):
                schedule = json.loads(schedule)
            for entry in schedule:
                if entry["stopId"] == stop_id:
                    h, m = (int(p) for p in entry["arrivalTime"].split(":"))
                    arrival_times.append(datetime.time(h, m))

        if not arrival_times:
            raise ValueError(
                f"No arrivals found at '{stop_name}' across any vehicle"
            )

        if extreme_type.lower() == "earliest":
            expected_time = min(arrival_times)
        else:
            expected_time = max(arrival_times)

        logger.info(
            "Expected %s arrival at '%s': %s, agent answer: %r",
            extreme_type, stop_name, expected_time, self.agent_answer,
        )
        return {
            "answer_matches": time_match(
                self.agent_answer, expected_time, tolerance_minutes=2
            )
        }
