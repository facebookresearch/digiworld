# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.music.base_scenario import MusicScenario


class DeletePlaylistScenario(MusicScenario, ComposableScenario):
    """Scenario for deleting a playlist by name."""

    def _get_checks(self, state_path):
        initial_rows = self._execute_query_in_path(
            "SELECT id FROM playlists WHERE name = ? AND user_id = ?",
            (self.name, self.current_user_id),
            self.initial_state_path,
        )
        if not initial_rows:
            raise ValueError(
                f"Playlist '{self.name}' not found for user {self.current_user_id} "
                "in initial state"
            )

        final_rows = self._execute_query_in_path(
            "SELECT id FROM playlists WHERE name = ? AND user_id = ?",
            (self.name, self.current_user_id),
            state_path,
        )
        return {"playlist_deleted": len(final_rows) == 0}
