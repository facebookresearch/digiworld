# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: rate the most recent ride, then report its cost."""

from digiworld.scenarios.answer_matchers import float_match, substring_match
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.verification import ComposableScenario


class RateRideAndCheckCostScenario(RydeScenario, ComposableScenario):
    """Verify feedback was submitted and the agent reports the ride cost."""

    def _get_checks(self, state_path):
        # --- Rate ride checks (from rate_recent_ride) ---
        rides = self._execute_query_in_path(
            "SELECT id FROM rides WHERE user_id = ? AND status = 'completed' "
            "ORDER BY end_time DESC LIMIT 1",
            (self.current_user_id,),
            self.initial_state_path,
        )
        if not rides:
            raise ValueError("No completed rides found for user")

        ride_id = rides[0][0]

        feedback_rows = self._execute_query_in_path(
            "SELECT rating, comment FROM feedback WHERE ride_id = ?",
            (ride_id,),
            state_path,
        )

        if not feedback_rows:
            feedback_submitted = False
            rating_matches = False
            comment_matches = False
        else:
            feedback_submitted = True
            actual_rating = int(feedback_rows[0][0])
            actual_comment = feedback_rows[0][1] or ""
            expected_rating = int(self.rating)
            rating_matches = actual_rating == expected_rating
            comment_matches = substring_match(actual_comment, self.comment)

        # --- Cost check (from most_recent_ride_cost) ---
        cost_results = self._execute_query_in_path(
            "SELECT fare_amount FROM rides WHERE user_id = ? AND status = 'completed' "
            "ORDER BY end_time DESC LIMIT 1",
            (self.current_user_id,),
            self.initial_state_path,
        )
        if not cost_results:
            raise ValueError("No completed rides found for user")

        expected_fare = cost_results[0][0]

        return {
            "feedback_submitted": feedback_submitted,
            "rating_matches": rating_matches,
            "comment_matches": comment_matches,
            "answer_matches": float_match(self.agent_answer, expected_fare),
        }
