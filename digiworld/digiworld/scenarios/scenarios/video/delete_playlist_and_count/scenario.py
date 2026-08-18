import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DeletePlaylistAndCountScenario(VideoScenario, ComposableScenario):
    """Verify that a playlist was deleted and the agent correctly reports
    the remaining playlist count."""

    def _get_checks(self, state_path):
        # --- delete_playlist checks ---
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

        # --- count_user_content checks (metric = playlists) ---
        initial_count = self._query_playlist_count(self.initial_state_path)
        expected_count = initial_count - 1
        answer_matches = numeric_match(self.agent_answer, expected_count)
        logger.info(
            f"Expected playlist count: {expected_count}, "
            f"agent answer: {self.agent_answer!r}, match={answer_matches}"
        )

        return {
            "playlist_deleted": deleted,
            "answer_matches": answer_matches,
        }

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
