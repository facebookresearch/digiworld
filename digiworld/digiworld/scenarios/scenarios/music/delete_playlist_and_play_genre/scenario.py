import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DeletePlaylistAndPlayGenreScenario(MusicScenario, ComposableScenario):
    """Verify that a playlist was deleted and a song from the specified
    genre is currently playing."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- delete_playlist checks ---
        initial_rows = self._execute_query_in_path(
            "SELECT id FROM playlists WHERE name = ? AND user_id = ?",
            (self.name, self.current_user_id),
            self.initial_state_path,
        )
        if not initial_rows:
            raise ValueError(
                f"Playlist '{self.name}' not found for user "
                f"{self.current_user_id} in initial state"
            )

        final_rows = self._execute_query_in_path(
            "SELECT id FROM playlists WHERE name = ? AND user_id = ?",
            (self.name, self.current_user_id),
            state_path,
        )
        playlist_deleted = len(final_rows) == 0

        logger.info(f"Playlist '{self.name}': deleted={playlist_deleted}")

        # --- play_genre_playlist checks ---
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
            logger.info("No song currently playing")
            return {
                "playlist_deleted": playlist_deleted,
                "song_playing": False,
                "correct_genre": False,
            }

        song_rows = self._execute_query_in_path(
            "SELECT categories FROM songs WHERE id = ?",
            (current_song_id,),
            state_path,
        )
        if not song_rows:
            return {
                "playlist_deleted": playlist_deleted,
                "song_playing": True,
                "correct_genre": False,
            }

        categories = json.loads(song_rows[0][0]) if song_rows[0][0] else []

        logger.info(
            f"Song {current_song_id} categories: {categories}, "
            f"expected category: {category_id}"
        )

        return {
            "playlist_deleted": playlist_deleted,
            "song_playing": True,
            "correct_genre": category_id in categories,
        }
