# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateAndPlayPlaylistScenario(MusicScenario, ComposableScenario):
    """Verify that a new playlist was created and is currently playing."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- create_playlist check ---
        # Adapted from CreatePlaylistScenario._check_task_completion
        query = """
        SELECT id, name, user_id
        FROM playlists
        WHERE name = ?
            AND user_id = ?
        ORDER BY created_at DESC
        """
        _, _, new_playlists = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.name, self.current_user_id),
        )
        playlist_created = len(new_playlists) > 0

        # --- play_playlist checks ---
        # Look up the playlist id in the final state
        rows = self._execute_query_in_path(
            "SELECT id FROM playlists WHERE name = ? AND user_id = ?",
            (self.name, self.current_user_id),
            state_path,
        )
        if not rows:
            logger.info(f"Playlist '{self.name}' not found in final state")
            return {
                "playlist_created": playlist_created,
                "song_playing": False,
                "queue_source_is_playlist": False,
                "correct_playlist": False,
            }

        playlist_id = rows[0][0]

        rootstore_path = os.path.join(state_path, "rootstore.json")
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        music_store = rootstore.get("musicStore", {})
        current_song_id = music_store.get("currentSongId")
        queue_state = music_store.get("queueState", {})

        return {
            "playlist_created": playlist_created,
            "song_playing": current_song_id is not None,
            "queue_source_is_playlist": queue_state.get("sourceType") == "playlist",
            "correct_playlist": queue_state.get("sourceId") == playlist_id,
        }
