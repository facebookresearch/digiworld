# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreatePlaylistScenario(VideoScenario, ComposableScenario):
    """Verify that a new playlist was created with the specified name and
    description."""

    def _get_checks(self, state_path):
        found, desc_matches = self._check_playlist(state_path)
        logger.info(
            f"Playlist '{self.playlist_name}': found={found}, "
            f"desc_matches={desc_matches}"
        )
        return {
            "playlist_created": found,
            "description_matches": desc_matches,
        }

    def _check_playlist(self, state_path):
        query = (
            "SELECT name, description FROM playlists "
            "WHERE user_id = ? AND LOWER(name) = LOWER(?) "
            "AND deleted_at IS NULL"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, self.playlist_name), state_path
        )
        if not rows:
            return False, False

        _, description = rows[0]
        if not self.playlist_description:
            return True, True
        desc_matches = (
            description is not None
            and description.strip().lower() == self.playlist_description.strip().lower()
        )
        return True, desc_matches
