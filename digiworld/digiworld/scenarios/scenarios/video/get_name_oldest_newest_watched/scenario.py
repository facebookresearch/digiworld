# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetNameOldestNewestWatchedScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports the title of the oldest or
    newest video in the user's watch history."""

    def _get_checks(self, state_path):
        expected_title = self._query_video_title()
        result = substring_match(self.agent_answer, expected_title)

        if not result and len(expected_title) > 30:
            # The app UI may truncate long titles. Accept if the agent
            # reported a substantial prefix of the expected title.
            answer_lower = self.agent_answer.lower()
            prefix = expected_title[:30].lower()
            result = prefix in answer_lower

        logger.info(
            "Expected title=%r, agent answer=%r, matches=%s",
            expected_title, self.agent_answer, result,
        )
        return {"answer_matches": result}

    def _query_video_title(self) -> str:
        sort_dir = "ASC" if self.order == "oldest" else "DESC"
        query = (
            "SELECT v.title FROM history h "
            "JOIN videos v ON h.video_id = v.id "
            "WHERE h.user_id = ? AND v.status = 'active' "
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
        return rows[0][0]
