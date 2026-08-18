# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
import unicodedata

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


def _normalize_hyphens(text: str) -> str:
    """Replace Unicode non-breaking hyphens (U+2011) and other
    hyphen-like characters with a standard ASCII hyphen (U+002D)
    so that comparisons are resilient to copy-paste variants."""
    return text.replace("\u2011", "-").replace("\u2010", "-")


class AddVideosToPlaylistScenario(VideoScenario, ComposableScenario):
    """Verify that two specified videos were added to a playlist."""

    def _get_checks(self, state_path):
        playlist_id = self._find_playlist(state_path)
        v1_id = self._find_video(self.video_1, state_path)
        v2_id = self._find_video(self.video_2, state_path)

        v1_in = self._video_in_playlist(playlist_id, v1_id, state_path)
        v2_in = self._video_in_playlist(playlist_id, v2_id, state_path)

        logger.info(
            f"Playlist {playlist_id}: video_1({v1_id}) added={v1_in}, "
            f"video_2({v2_id}) added={v2_in}"
        )
        return {"video_1_added": v1_in, "video_2_added": v2_in}

    def _find_playlist(self, state_path) -> int:
        rows = self._execute_query_in_path(
            "SELECT id FROM playlists "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.playlist_name, self.current_user_id),
            state_path,
        )
        if not rows:
            raise ValueError(
                f"Playlist {self.playlist_name!r} not found for user "
                f"{self.current_user_id} in {state_path}"
            )
        return int(rows[0][0])

    def _find_video(self, title: str, state_path) -> int:
        normalized_title = _normalize_hyphens(title)
        rows = self._execute_query_in_path(
            "SELECT id, title FROM videos "
            "WHERE status = 'active'",
            (),
            state_path,
        )
        for row in rows:
            if _normalize_hyphens(row[1]).lower() == normalized_title.lower():
                return int(row[0])
        raise ValueError(
            f"Video {title!r} not found in {state_path}"
        )

    def _video_in_playlist(self, playlist_id: int, video_id: int, state_path) -> bool:
        rows = self._execute_query_in_path(
            "SELECT COUNT(*) FROM playlist_videos "
            "WHERE playlist_id = ? AND video_id = ?",
            (playlist_id, video_id),
            state_path,
        )
        return rows[0][0] > 0
