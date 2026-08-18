import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreatePlaylistAndPlayArtistScenario(MusicScenario, ComposableScenario):
    """Verify that a new playlist was created and a song by the specified
    artist is currently playing."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- create_playlist checks ---
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

        logger.info(
            f"Playlist '{self.name}': created={playlist_created}"
        )

        # --- play_artist checks ---
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
            logger.info("No song currently playing")
            return {
                "playlist_created": playlist_created,
                "song_playing": False,
                "correct_artist": False,
            }

        song_rows = self._execute_query_in_path(
            "SELECT artist_id FROM songs WHERE id = ?",
            (current_song_id,),
            state_path,
        )
        if not song_rows:
            return {
                "playlist_created": playlist_created,
                "song_playing": True,
                "correct_artist": False,
            }

        correct_artist = song_rows[0][0] == artist_id
        logger.info(
            f"Song {current_song_id} artist_id: {song_rows[0][0]}, "
            f"expected: {artist_id}, match={correct_artist}"
        )

        return {
            "playlist_created": playlist_created,
            "song_playing": True,
            "correct_artist": correct_artist,
        }
