# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import rounded_numeric_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetChannelSubscriberCountScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports a channel's subscriber count."""

    def _get_checks(self, state_path):
        expected = self._query_subscriber_count()
        logger.info(
            f"Expected subscriber count: {expected}, agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": rounded_numeric_match(self.agent_answer, expected, tolerance_percent=5.0),
        }

    def _query_subscriber_count(self) -> int:
        """Look up subscriber_count from the initial state DB via the video title."""
        query = """
        SELECT c.subscriber_count
        FROM videos v
        JOIN channels c ON v.channel_id = c.id
        WHERE LOWER(v.title) = LOWER(?)
        """
        rows = self._execute_query_in_path(
            query, (self.title,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No channel found for video title {self.title!r} "
                f"in {self.initial_state_path}"
            )
        return int(rows[0][0])
