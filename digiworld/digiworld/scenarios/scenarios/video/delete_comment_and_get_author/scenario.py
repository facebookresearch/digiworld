import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DeleteCommentAndGetAuthorScenario(VideoScenario, ComposableScenario):
    """Verify that the most recent comment was deleted and the agent
    correctly reports the author of the oldest comment on the same video."""

    def _get_checks(self, state_path):
        # --- delete_comment checks ---
        comment_id = self._find_newest_comment_id()
        still_visible = self._comment_still_visible(state_path, comment_id)
        logger.info(
            f"Comment id: {comment_id}, still visible in final state: "
            f"{still_visible}"
        )

        # --- get_comment_author checks (oldest comment) ---
        expected_author = self._query_oldest_comment_author()
        answer_matches = substring_match(self.agent_answer, expected_author)
        logger.info(
            f"Expected oldest comment author: {expected_author!r}, "
            f"agent answer: {self.agent_answer!r}, match={answer_matches}"
        )

        return {
            "comment_deleted": not still_visible,
            "answer_matches": answer_matches,
        }

    # -- helpers from delete_comment --

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

    # -- helpers from get_comment_author (oldest) --

    def _query_oldest_comment_author(self) -> str:
        query = (
            "SELECT u.username FROM comments c "
            "JOIN users u ON c.user_id = u.id "
            "JOIN videos v ON c.video_id = v.id "
            "WHERE LOWER(v.title) = LOWER(?) "
            "AND c.parent_id IS NULL AND c.status = 'visible' "
            "ORDER BY c.created_at ASC LIMIT 1"
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
