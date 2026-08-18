# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.answer_matchers import date_match


class PastRideDateScenario(RydeScenario, ComposableScenario):
    """Verify the agent correctly reports the date of the oldest or most recent past ride."""

    def _get_checks(self, state_path):
        order = "ASC" if self.recency.lower() == "oldest" else "DESC"
        results = self._execute_query_in_path(
            f"SELECT start_time FROM rides WHERE user_id = ? AND status = 'completed' ORDER BY start_time {order} LIMIT 1",
            (self.current_user_id,),
            self.initial_state_path,
        )
        if not results:
            raise ValueError("No completed rides found for user")

        ride_time_str = results[0][0]
        ride_date = datetime.datetime.fromisoformat(ride_time_str.replace('Z', '+00:00')).date()

        return {"answer_matches": date_match(self.agent_answer, ride_date)}
