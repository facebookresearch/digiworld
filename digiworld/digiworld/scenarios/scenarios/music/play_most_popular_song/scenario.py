# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario


class PlayMostPopularSongScenario(MusicScenario, ComposableScenario):
    """Scenario for playing the song with the highest play count."""

    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            "SELECT MAX(play_count) FROM songs", (), self.initial_state_path
        )
        if not rows or rows[0][0] is None:
            raise ValueError("No songs found in the database")
        max_play_count = rows[0][0]

        rootstore_path = os.path.join(state_path, "rootstore.json")
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_song_id = rootstore.get("musicStore", {}).get("currentSongId")
        if current_song_id is None:
            return {"correct_song_playing": False}

        song_rows = self._execute_query_in_path(
            "SELECT play_count FROM songs WHERE id = ?",
            (current_song_id,),
            state_path,
        )
        if not song_rows:
            return {"correct_song_playing": False}

        return {"correct_song_playing": song_rows[0][0] == max_play_count}
