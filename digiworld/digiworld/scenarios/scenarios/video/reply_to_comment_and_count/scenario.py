# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ReplyToCommentAndCountScenario(VideoScenario, ComposableScenario):
    """Verify that the agent replied to the newest comment on a video and
    correctly reports the total comment count afterward."""

    def _get_checks(self, state_path):
        # --- reply_to_comment checks ---
        parent_id = self._find_newest_comment_id()
        reply_found = self._check_reply_exists(state_path, parent_id)
        logger.info(
            f"Parent comment id: {parent_id}, reply found: {reply_found}"
        )

        # --- get_video_view_or_comment_count checks (metric = comments) ---
        # Query comment_count from the final state since the reply may have
        # incremented it.
        expected_count = self._query_comment_count(state_path)
        answer_matches = numeric_match(self.agent_answer, expected_count)
        logger.info(
            f"Expected comment count: {expected_count}, "
            f"agent answer: {self.agent_answer!r}, match={answer_matches}"
        )

        return {
            "reply_posted": reply_found,
            "answer_matches": answer_matches,
        }

    # -- helpers from reply_to_comment --

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

    def _check_reply_exists(self, state_path, parent_id: int) -> bool:
        query = (
            "SELECT id FROM comments "
            "WHERE parent_id = ? AND LOWER(content) = LOWER(?)"
        )
        rows = self._execute_query_in_path(
            query, (parent_id, self.reply_text), state_path
        )
        return bool(rows)

    # -- helpers from get_video_view_or_comment_count --

    def _query_comment_count(self, path) -> int:
        query = (
            "SELECT comment_count FROM videos "
            "WHERE LOWER(title) = LOWER(?) AND status = 'active'"
        )
        rows = self._execute_query_in_path(
            query, (self.title,), path
        )
        if not rows:
            raise ValueError(
                f"No video found with title {self.title!r} in {path}"
            )
        return int(rows[0][0])
