# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SearchForArtistScenario(MusicScenario, ComposableScenario):
    """Verify that a search was performed for the specified artist."""

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
        search_query = music_store.get("searchQuery", "")

        if not search_query:
            query_matches = False
        else:
            query_lower = search_query.lower()
            artist_words = [w for w in self.artist_name.lower().split() if len(w) >= 3]
            query_matches = (
                any(word in query_lower for word in artist_words)
                if artist_words
                else self.artist_name.lower() in query_lower
            )

        search_results = music_store.get("searchResults", {})
        artist_in_results = artist_id in search_results.get("artistIds", [])

        return {
            "search_query_matches": query_matches,
            "artist_in_results": artist_in_results,
        }
