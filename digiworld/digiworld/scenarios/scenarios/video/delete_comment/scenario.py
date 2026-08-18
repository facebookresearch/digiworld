# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DeleteCommentScenario(VideoScenario, ComposableScenario):
    """Verify that the agent deleted the most recent comment on a video."""

    def _get_checks(self, state_path):
        comment_id = self._find_newest_comment_id()
        still_visible = self._comment_still_visible(state_path, comment_id)
        logger.info(
            f"Comment id: {comment_id}, still visible in final state: {still_visible}"
        )
        return {
            "comment_deleted": not still_visible,
        }

    def _find_newest_comment_id(self) -> int:
        query = (
            "SELECT c.id FROM comments c "
            "JOIN videos v ON c.video_id = v.id "
            "WHERE LOWER(v.title) = LOWER(?) "
            "AND c.parent_id IS NULL AND c.status = 'visible' "
            "ORDER BY c.created_at DESC LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.title,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No comments found for video title {self.title!r} "
                f"in {self.initial_state_path}"
            )
        return int(rows[0][0])

    def _comment_still_visible(self, state_path, comment_id: int) -> bool:
        query = "SELECT id FROM comments WHERE id = ? AND status = 'visible'"
        rows = self._execute_query_in_path(query, (comment_id,), state_path)
        return bool(rows)
