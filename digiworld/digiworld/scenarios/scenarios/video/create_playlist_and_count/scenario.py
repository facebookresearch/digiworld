# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreatePlaylistAndCountScenario(VideoScenario, ComposableScenario):
    """Verify that a new playlist was created and the agent correctly reports
    the resulting playlist count."""

    def _get_checks(self, state_path):
        # --- create_playlist checks ---
        found, desc_matches = self._check_playlist(state_path)
        logger.info(
            f"Playlist '{self.playlist_name}': found={found}, "
            f"desc_matches={desc_matches}"
        )

        # --- count_user_content checks (metric = playlists) ---
        initial_count = self._query_playlist_count(self.initial_state_path)
        expected_count = initial_count + 1
        answer_matches = numeric_match(self.agent_answer, expected_count)
        logger.info(
            f"Expected playlist count: {expected_count}, "
            f"agent answer: {self.agent_answer!r}, match={answer_matches}"
        )

        return {
            "playlist_created": found,
            "description_matches": desc_matches,
            "answer_matches": answer_matches,
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

    def _query_playlist_count(self, path) -> int:
        query = (
            "SELECT COUNT(*) FROM playlists "
            "WHERE user_id = ? AND deleted_at IS NULL"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), path
        )
        if not rows:
            return 0
        return int(rows[0][0])
