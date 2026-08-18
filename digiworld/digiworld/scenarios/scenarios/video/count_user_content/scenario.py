# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match, rounded_numeric_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

METRIC_QUERIES = {
    "videos": (
        "SELECT COUNT(*) FROM videos v "
        "JOIN channels c ON v.channel_id = c.id "
        "WHERE c.user_id = ? AND v.status = 'active'"
    ),
    "playlists": (
        "SELECT COUNT(*) FROM playlists "
        "WHERE user_id = ? AND deleted_at IS NULL"
    ),
    "total views": (
        "SELECT COALESCE(SUM(v.view_count), 0) FROM videos v "
        "JOIN channels c ON v.channel_id = c.id "
        "WHERE c.user_id = ? AND v.status = 'active'"
    ),
}


class CountUserContentScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports a content-count metric."""

    def _get_checks(self, state_path):
        expected = self._query_metric()
        logger.info(
            f"Expected {self.metric!r}: {expected}, "
            f"agent answer: {self.agent_answer!r}"
        )
        
        # Use rounded_numeric_match for "total views" (formatted as K/M in app)
        # Use exact numeric_match for counts (videos, playlists)
        if self.metric.lower() == "total views":
            match_result = rounded_numeric_match(self.agent_answer, expected, tolerance_percent=5.0)
        else:
            match_result = numeric_match(self.agent_answer, expected)
        
        return {
            "answer_matches": match_result,
        }

    def _query_metric(self) -> int:
        key = self.metric.lower()
        query = METRIC_QUERIES.get(key)
        if query is None:
            raise ValueError(
                f"Unknown metric {self.metric!r}. "
                f"Supported: {list(METRIC_QUERIES.keys())}"
            )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"Query for metric {self.metric!r} returned no results"
            )
        return int(rows[0][0])
