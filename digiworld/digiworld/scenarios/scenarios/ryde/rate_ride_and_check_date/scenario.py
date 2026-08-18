# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: rate the most recent ride, then report its date."""

import datetime

from digiworld.scenarios.answer_matchers import date_match, substring_match
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.verification import ComposableScenario


class RateRideAndCheckDateScenario(RydeScenario, ComposableScenario):
    """Verify feedback was submitted and the agent reports the ride date."""

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

        # --- Date check (from past_ride_date, recency="most recent") ---
        results = self._execute_query_in_path(
            "SELECT start_time FROM rides WHERE user_id = ? AND status = 'completed' "
            "ORDER BY start_time DESC LIMIT 1",
            (self.current_user_id,),
            self.initial_state_path,
        )
        if not results:
            raise ValueError("No completed rides found for user")

        ride_time_str = results[0][0]
        ride_date = datetime.datetime.fromisoformat(
            ride_time_str.replace('Z', '+00:00')
        ).date()

        return {
            "feedback_submitted": feedback_submitted,
            "rating_matches": rating_matches,
            "comment_matches": comment_matches,
            "answer_matches": date_match(self.agent_answer, ride_date),
        }
