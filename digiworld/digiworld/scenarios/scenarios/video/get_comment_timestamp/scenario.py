# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from datetime import datetime

from digiworld.scenarios.answer_matchers import date_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetCommentTimestampScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports when a comment was made."""

    def _get_checks(self, state_path):
        expected_date = self._query_comment_date()
        logger.info(
            f"Expected date: {expected_date}, agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": date_match(self.agent_answer, expected_date),
        }

    def _sort_direction(self) -> str:
        order = self.order.lower()
        if "latest" in order or "most recent" in order or "newest" in order:
            return "DESC"
        return "ASC"

    def _query_comment_date(self):
        sort_dir = self._sort_direction()
        query = (
            "SELECT c.created_at FROM comments c "
            "JOIN videos v ON c.video_id = v.id "
            "WHERE LOWER(v.title) = LOWER(?) "
            "AND c.parent_id IS NULL AND c.status = 'visible' "
            f"ORDER BY c.created_at {sort_dir} LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.title,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No comments found for video title {self.title!r} "
                f"in {self.initial_state_path}"
            )
        raw = rows[0][0]
        for fmt in ("%Y-%m-%dT%H:%M:%S.%fZ", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S.%f", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(raw, fmt).date()
            except ValueError:
                continue
        raise ValueError(f"Unable to parse timestamp {raw!r}")
