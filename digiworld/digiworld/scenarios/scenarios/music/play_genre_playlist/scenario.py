# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for playing songs from a specific genre category."""

import json
import os
from typing import Dict

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario


class PlayGenrePlaylistScenario(MusicScenario, ComposableScenario):
    """Verify that a song of the specified genre is currently playing."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        rows = self._execute_query_in_path(
            "SELECT id FROM categories WHERE LOWER(name) = LOWER(?)",
            (self.genre,),
            state_path,
        )
        if not rows:
            raise ValueError(f"Genre '{self.genre}' not found")

        category_id = str(rows[0][0])

        rootstore_path = os.path.join(state_path, "rootstore.json")
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        music_store = rootstore.get("musicStore", {})
        current_song_id = music_store.get("currentSongId")

        if current_song_id is None:
            return {"song_playing": False, "correct_genre": False}

        song_rows = self._execute_query_in_path(
            "SELECT categories FROM songs WHERE id = ?",
            (current_song_id,),
            state_path,
        )
        if not song_rows:
            return {"song_playing": True, "correct_genre": False}

        categories = json.loads(song_rows[0][0]) if song_rows[0][0] else []

        return {
            "song_playing": True,
            "correct_genre": category_id in categories,
        }
