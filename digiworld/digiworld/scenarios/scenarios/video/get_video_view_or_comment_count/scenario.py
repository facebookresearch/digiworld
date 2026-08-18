# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match, rounded_numeric_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_METRIC_TO_COLUMN = {
    "views": "view_count",
    "comments": "comment_count",
}


class GetVideoViewOrCommentCountScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports a video's view or comment count."""

    def _get_checks(self, state_path):
        expected = self._query_count()
        
        # Use rounded_numeric_match for views (formatted as K/M in app)
        # Use exact numeric_match for comments (not formatted)
        if self.metric == "views":
            result = rounded_numeric_match(self.agent_answer, expected, tolerance_percent=5.0)
        else:
            result = numeric_match(self.agent_answer, expected)
        
        logger.info(
            f"Metric={self.metric}, expected={expected}, "
            f"agent answer: {self.agent_answer!r}, match={result}"
        )
        return {"answer_matches": result}

    def _query_count(self) -> int:
        column = _METRIC_TO_COLUMN.get(self.metric)
        if column is None:
            raise ValueError(
                f"Unknown metric {self.metric!r}; expected one of "
                f"{list(_METRIC_TO_COLUMN)}"
            )
        query = (
            f"SELECT {column} FROM videos "
            f"WHERE LOWER(title) = LOWER(?) AND status = 'active'"
        )
        rows = self._execute_query_in_path(
            query, (self.title,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No video found with title {self.title!r} "
                f"in {self.initial_state_path}"
            )
        return int(rows[0][0])
