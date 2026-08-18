# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class PlayArtistScenario(MusicScenario, ComposableScenario):
    """Verify that a song by the specified artist is currently playing."""

    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            "SELECT id FROM artists WHERE name = ?",
            (self.artist_name,),
            state_path,
        )
        if not rows:
            raise ValueError(f"Artist '{self.artist_name}' not found")
        artist_id = rows[0][0]

        rootstore_path = os.path.join(state_path, "rootstore.json")
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        music_store = rootstore.get("musicStore", {})
        current_song_id = music_store.get("currentSongId")

        if current_song_id is None:
            return {"song_playing": False, "correct_artist": False}

        song_rows = self._execute_query_in_path(
            "SELECT artist_id FROM songs WHERE id = ?",
            (current_song_id,),
            state_path,
        )
        if not song_rows:
            return {"song_playing": True, "correct_artist": False}

        return {
            "song_playing": True,
            "correct_artist": song_rows[0][0] == artist_id,
        }
