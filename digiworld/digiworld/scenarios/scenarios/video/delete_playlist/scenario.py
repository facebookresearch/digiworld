# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DeletePlaylistScenario(VideoScenario, ComposableScenario):
    """Verify that a specified playlist was deleted."""

    def _get_checks(self, state_path):
        initial_rows = self._execute_query_in_path(
            "SELECT id FROM playlists "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.playlist_name, self.current_user_id),
            self.initial_state_path,
        )
        if not initial_rows:
            raise ValueError(
                f"Playlist {self.playlist_name!r} not found for user "
                f"{self.current_user_id} in initial state"
            )

        final_rows = self._execute_query_in_path(
            "SELECT id FROM playlists "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.playlist_name, self.current_user_id),
            state_path,
        )
        deleted = len(final_rows) == 0
        logger.info(f"Playlist {self.playlist_name!r}: deleted={deleted}")
        return {"playlist_deleted": deleted}
