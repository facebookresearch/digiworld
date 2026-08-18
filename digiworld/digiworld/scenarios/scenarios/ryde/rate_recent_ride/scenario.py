# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Verify the agent submitted feedback for the most recent completed ride."""

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.verification import ComposableScenario


class RateRecentRideScenario(RydeScenario, ComposableScenario):
    """Verify the agent submitted feedback for the most recent completed ride."""

    def _get_checks(self, state_path):
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
            return {
                "feedback_submitted": False,
                "rating_matches": False,
                "comment_matches": False,
            }

        actual_rating = int(feedback_rows[0][0])
        actual_comment = feedback_rows[0][1] or ""
        expected_rating = int(self.rating)

        return {
            "feedback_submitted": True,
            "rating_matches": actual_rating == expected_rating,
            "comment_matches": substring_match(actual_comment, self.comment),
        }
