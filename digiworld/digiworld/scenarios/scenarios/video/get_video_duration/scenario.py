# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import duration_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetVideoDurationScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports a video's duration."""

    def _get_checks(self, state_path):
        expected = self._query_duration()
        result = duration_match(self.agent_answer, expected, tolerance_seconds=5)
        logger.info(
            f"Expected duration: {expected}s, agent answer: {self.agent_answer!r}, "
            f"match={result}"
        )
        return {"answer_matches": result}

    def _query_duration(self) -> int:
        rows = self._execute_query_in_path(
            "SELECT duration FROM videos "
            "WHERE LOWER(title) = LOWER(?) AND status = 'active'",
            (self.title,),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(
                f"No video found with title {self.title!r} "
                f"in {self.initial_state_path}"
            )
        return int(rows[0][0])
