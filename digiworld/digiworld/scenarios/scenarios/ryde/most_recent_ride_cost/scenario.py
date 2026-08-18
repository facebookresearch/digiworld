# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.answer_matchers import float_match


class MostRecentRideCostScenario(RydeScenario, ComposableScenario):
    """Verify the agent correctly reports the cost of the most recent completed ride."""

    def _get_checks(self, state_path):
        results = self._execute_query_in_path(
            "SELECT fare_amount FROM rides WHERE user_id = ? AND status = 'completed' ORDER BY end_time DESC LIMIT 1",
            (self.current_user_id,),
            self.initial_state_path,
        )
        if not results:
            raise ValueError("No completed rides found for user")

        expected_fare = results[0][0]
        return {"answer_matches": float_match(self.agent_answer, expected_fare)}
