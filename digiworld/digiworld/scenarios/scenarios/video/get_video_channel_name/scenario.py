# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetVideoChannelNameScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports the channel name for a video."""

    def _get_checks(self, state_path):
        expected = self._query_channel_name()
        result = substring_match(self.agent_answer, expected)
        logger.info(
            f"Expected channel: {expected!r}, agent answer: {self.agent_answer!r}, "
            f"match={result}"
        )
        return {"answer_matches": result}

    def _query_channel_name(self) -> str:
        rows = self._execute_query_in_path(
            "SELECT c.name FROM videos v "
            "JOIN channels c ON v.channel_id = c.id "
            "WHERE LOWER(v.title) = LOWER(?)",
            (self.title,),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(
                f"No channel found for video title {self.title!r} "
                f"in {self.initial_state_path}"
            )
        return str(rows[0][0])
