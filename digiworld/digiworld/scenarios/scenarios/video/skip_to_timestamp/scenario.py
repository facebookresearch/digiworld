# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

PROGRESS_TOLERANCE_SECONDS = 60


class SkipToTimestampScenario(VideoScenario, ComposableScenario):
    """Verify that the agent skipped to the correct timestamp in a video."""

    def _get_checks(self, state_path):
        expected_video_id = self._find_video_id()
        rootstore = self._load_rootstore(state_path)

        playback = rootstore.get("videoStore", {}).get("playbackState", {})
        current_id = playback.get("currentVideoId")
        progress = playback.get("progress", 0)

        target_seconds = int(self.minutes) * 60
        video_matches = current_id == expected_video_id
        progress_matches = abs(progress - target_seconds) <= PROGRESS_TOLERANCE_SECONDS

        logger.info(
            f"Expected video id: {expected_video_id}, current: {current_id}, "
            f"target progress: {target_seconds}s, actual: {progress}s"
        )
        return {
            "correct_video": video_matches,
            "progress_correct": progress_matches,
        }

    def _find_video_id(self) -> int:
        query = "SELECT id FROM videos WHERE LOWER(title) = LOWER(?)"
        rows = self._execute_query_in_path(
            query, (self.title,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No video found with title {self.title!r} "
                f"in {self.initial_state_path}"
            )
        return int(rows[0][0])

    def _load_rootstore(self, state_path) -> dict:
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")
        with open(rootstore_path, "r") as f:
            return json.load(f)
