# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CountWatchHistoryScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports the watch-history count."""

    def _get_checks(self, state_path):
        expected = self._query_history_count()
        logger.info(
            f"Expected history count: {expected}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": numeric_match(self.agent_answer, expected),
        }

    def _query_history_count(self) -> int:
        query = "SELECT COUNT(*) FROM history WHERE user_id = ?"
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"History query returned no results for user {self.current_user_id}"
            )
        return int(rows[0][0])
