# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SearchAndPlayArtistScenario(MusicScenario, ComposableScenario):
    """Verify that the agent searched for the specified artist and is
    playing a song by them."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # Look up the artist id
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

        # --- search_for_artist checks ---
        search_query = music_store.get("searchQuery", "")
        if not search_query:
            query_matches = False
        else:
            query_lower = search_query.lower()
            artist_words = [
                w for w in self.artist_name.lower().split() if len(w) >= 3
            ]
            query_matches = (
                any(word in query_lower for word in artist_words)
                if artist_words
                else self.artist_name.lower() in query_lower
            )

        search_results = music_store.get("searchResults", {})
        artist_in_results = artist_id in search_results.get("artistIds", [])

        # --- play_artist checks ---
        current_song_id = music_store.get("currentSongId")

        if current_song_id is None:
            song_playing = False
            correct_artist = False
        else:
            song_playing = True
            song_rows = self._execute_query_in_path(
                "SELECT artist_id FROM songs WHERE id = ?",
                (current_song_id,),
                state_path,
            )
            correct_artist = (
                bool(song_rows) and song_rows[0][0] == artist_id
            )

        return {
            "search_query_matches": query_matches,
            "artist_in_results": artist_in_results,
            "song_playing": song_playing,
            "correct_artist": correct_artist,
        }
