# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for EnableShufflePlayPlaylistScenario."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import EnableShufflePlayPlaylistScenario


SCHEMA_SQL = [
    (
        "CREATE TABLE playlists ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, description TEXT, "
        "is_public INTEGER, shuffle INTEGER, share_url TEXT, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    ),
]


def _make_db(tmp_dir, playlists=None, db_name="default.db"):
    db_path = os.path.join(tmp_dir, db_name)
    conn = sqlite3.connect(db_path)
    for sql in SCHEMA_SQL:
        conn.execute(sql)
    for pl in (playlists or []):
        conn.execute(
            "INSERT INTO playlists (id, user_id, name, shuffle) "
            "VALUES (?, ?, ?, ?)",
            (pl["id"], pl.get("user_id", 1), pl["name"], pl.get("shuffle", 0)),
        )
    conn.commit()
    conn.close()


def _make_rootstore(tmp_dir, is_playing=True, current_video_id=1,
                    playlist_order=None):
    rootstore = {
        "videoStore": {
            "playbackState": {
                "currentVideoId": current_video_id,
                "isPlaying": is_playing,
                "progress": 0,
                "duration": 300,
                "playlistOrder": playlist_order or [],
                "playlistIndex": 0,
                "currentPlaylist": None,
            }
        }
    }
    with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


class TestEnableShufflePlayPlaylistScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(EnableShufflePlayPlaylistScenario, "__init__",
                          lambda self, *a, **kw: None):
            scenario = EnableShufflePlayPlaylistScenario.__new__(
                EnableShufflePlayPlaylistScenario
            )
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = _execute_query_in_path
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_pass_shuffle_enabled_and_playing(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, playlists=[{"id": 1, "name": "Watch Later", "shuffle": 1}])
            _make_rootstore(d, is_playing=True, current_video_id=9999,
                            playlist_order=[9999, 9998, 9997])
            scenario = self._make_scenario(playlist_name="Watch Later")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["shuffle_enabled"])
            self.assertTrue(checks["playlist_playing"])

    def test_fail_shuffle_not_enabled(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, playlists=[{"id": 1, "name": "Watch Later", "shuffle": 0}])
            _make_rootstore(d, is_playing=True, current_video_id=9999,
                            playlist_order=[9999, 9998])
            scenario = self._make_scenario(playlist_name="Watch Later")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["shuffle_enabled"])
            self.assertTrue(checks["playlist_playing"])

    def test_fail_not_playing(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, playlists=[{"id": 1, "name": "Watch Later", "shuffle": 1}])
            _make_rootstore(d, is_playing=False, current_video_id=None,
                            playlist_order=[])
            scenario = self._make_scenario(playlist_name="Watch Later")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["shuffle_enabled"])
            self.assertFalse(checks["playlist_playing"])

    def test_fail_no_rootstore(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, playlists=[{"id": 1, "name": "Watch Later", "shuffle": 1}])
            scenario = self._make_scenario(playlist_name="Watch Later")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["shuffle_enabled"])
            self.assertFalse(checks["playlist_playing"])

    def test_playlist_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d)
            scenario = self._make_scenario(playlist_name="Nonexistent")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_playing_with_video_id_but_not_is_playing(self):
        """A current video with non-empty playlist order counts as playing."""
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, playlists=[{"id": 1, "name": "My Mix", "shuffle": 1}])
            _make_rootstore(d, is_playing=False, current_video_id=9999,
                            playlist_order=[9999, 9998])
            scenario = self._make_scenario(playlist_name="My Mix")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["playlist_playing"])


if __name__ == "__main__":
    unittest.main()
