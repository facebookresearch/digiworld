# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetCommentAuthorScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports who made a comment on a video."""

    def _get_checks(self, state_path):
        expected = self._query_comment_author()
        logger.info(
            f"Expected author: {expected!r}, agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": substring_match(self.agent_answer, expected),
        }

    def _sort_direction(self) -> str:
        order = self.order.lower()
        if "most recent" in order or "latest" in order or "newest" in order:
            return "DESC"
        return "ASC"

    def _query_comment_author(self) -> str:
        sort_dir = self._sort_direction()
        query = (
            "SELECT u.username FROM comments c "
            "JOIN users u ON c.user_id = u.id "
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
        return rows[0][0]
