# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for playing a specific playlist by name."""

import json
import os
from typing import Dict

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario


class PlayPlaylistScenario(MusicScenario, ComposableScenario):
    """Verify that the specified playlist is being played."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        rows = self._execute_query_in_path(
            "SELECT id FROM playlists WHERE name = ? AND user_id = ?",
            (self.playlist_name, self.current_user_id),
            state_path,
        )
        if not rows:
            raise ValueError(f"Playlist '{self.playlist_name}' not found")

        playlist_id = rows[0][0]

        rootstore_path = os.path.join(state_path, "rootstore.json")
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        music_store = rootstore.get("musicStore", {})
        current_song_id = music_store.get("currentSongId")
        queue_state = music_store.get("queueState", {})

        return {
            "song_playing": current_song_id is not None,
            "queue_source_is_playlist": queue_state.get("sourceType") == "playlist",
            "correct_playlist": queue_state.get("sourceId") == playlist_id,
        }
