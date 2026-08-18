# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class EnableShufflePlayPlaylistScenario(VideoScenario, ComposableScenario):
    """Verify that shuffle was enabled on a playlist and playback started."""

    def _get_checks(self, state_path):
        shuffle_on = self._check_shuffle_enabled(state_path)
        playing = self._check_playlist_playing(state_path)

        logger.info(
            f"Playlist {self.playlist_name!r}: shuffle_enabled={shuffle_on}, "
            f"playlist_playing={playing}"
        )
        return {"shuffle_enabled": shuffle_on, "playlist_playing": playing}

    def _check_shuffle_enabled(self, state_path) -> bool:
        rows = self._execute_query_in_path(
            "SELECT shuffle FROM playlists "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.playlist_name, self.current_user_id),
            state_path,
        )
        if not rows:
            raise ValueError(
                f"Playlist {self.playlist_name!r} not found for user "
                f"{self.current_user_id} in {state_path}"
            )
        return int(rows[0][0]) == 1

    def _check_playlist_playing(self, state_path) -> bool:
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        video_store = rootstore.get("videoStore", {})
        playback = video_store.get("playbackState", {})

        current_video_id = playback.get("currentVideoId")
        is_playing = playback.get("isPlaying", False)
        playlist_order = playback.get("playlistOrder", [])

        return (is_playing or current_video_id is not None) and len(playlist_order) > 0
