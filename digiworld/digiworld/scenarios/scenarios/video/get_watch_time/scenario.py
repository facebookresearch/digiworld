# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import logging

from digiworld.scenarios.answer_matchers import flexible_date_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetWatchTimeScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports when the oldest or newest
    video in the user's watch history was watched."""

    def _get_checks(self, state_path):
        expected_date = self._query_watched_date()
        # Use flexible_date_match to handle both exact dates and relative time (e.g., "2 weeks ago")
        # Tolerance of 3 days accounts for rounding in relative time expressions
        result = flexible_date_match(self.agent_answer, expected_date, tolerance_days=3)
        logger.info(
            f"Expected date={expected_date}, "
            f"agent answer={self.agent_answer!r}, matches={result}"
        )
        return {"answer_matches": result}

    def _query_watched_date(self) -> datetime.date:
        sort_dir = "ASC" if self.order == "oldest" else "DESC"
        query = (
            "SELECT h.watched_at FROM history h "
            "WHERE h.user_id = ? "
            f"ORDER BY h.watched_at {sort_dir} LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No history entries found for user {self.current_user_id} "
                f"in {self.initial_state_path}"
            )
        timestamp_str = rows[0][0]
        dt = datetime.datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        return dt.date()
