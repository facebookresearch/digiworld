# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ViewOldestNewestHistoryScenario(VideoScenario, ComposableScenario):
    """Verify that the agent navigated to and is playing the oldest or newest
    video from the user's watch history."""

    def _get_checks(self, state_path):
        expected_video_id = self._query_history_video_id()
        current_video_id = self._get_current_video_id(state_path)
        matches = current_video_id is not None and current_video_id == expected_video_id
        logger.info(
            f"Expected video_id={expected_video_id}, "
            f"current video_id={current_video_id}, matches={matches}"
        )
        return {"correct_video_playing": matches}

    def _query_history_video_id(self) -> int:
        sort_dir = "ASC" if self.order == "oldest" else "DESC"
        query = (
            "SELECT h.video_id FROM history h "
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
        return int(rows[0][0])

    def _get_current_video_id(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return None
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)
        playback = rootstore.get("videoStore", {}).get("playbackState", {})
        return playback.get("currentVideoId")
