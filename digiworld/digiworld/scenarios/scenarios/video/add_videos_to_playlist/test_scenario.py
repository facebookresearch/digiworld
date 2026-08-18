# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddVideosToPlaylistScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddVideosToPlaylistScenario


SCHEMA_SQL = [
    (
        "CREATE TABLE playlists ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, description TEXT, "
        "is_public INTEGER, shuffle INTEGER, share_url TEXT, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    ),
    (
        "CREATE TABLE videos ("
        "id INTEGER PRIMARY KEY, channel_id INTEGER, title TEXT, description TEXT, "
        "video_url TEXT, category_id INTEGER, thumbnail_url TEXT, duration INTEGER, "
        "visibility TEXT, status TEXT, view_count INTEGER, like_count INTEGER, "
        "comment_count INTEGER, is_comments_enabled INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    ),
    (
        "CREATE TABLE playlist_videos ("
        "id INTEGER PRIMARY KEY, playlist_id INTEGER, video_id INTEGER, "
        "position INTEGER, added_at TEXT)"
    ),
]


def _make_db(tmp_dir, playlists=None, videos=None, playlist_videos=None,
             db_name="default.db"):
    db_path = os.path.join(tmp_dir, db_name)
    conn = sqlite3.connect(db_path)
    for sql in SCHEMA_SQL:
        conn.execute(sql)
    for pl in (playlists or []):
        conn.execute(
            "INSERT INTO playlists (id, user_id, name) VALUES (?, ?, ?)",
            (pl["id"], pl.get("user_id", 1), pl["name"]),
        )
    for v in (videos or []):
        conn.execute(
            "INSERT INTO videos (id, channel_id, title, status) VALUES (?, ?, ?, ?)",
            (v["id"], v.get("channel_id", 1), v["title"], v.get("status", "active")),
        )
    for pv in (playlist_videos or []):
        conn.execute(
            "INSERT INTO playlist_videos (id, playlist_id, video_id, position) "
            "VALUES (?, ?, ?, ?)",
            (pv["id"], pv["playlist_id"], pv["video_id"], pv.get("position", 0)),
        )
    conn.commit()
    conn.close()


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


class TestAddVideosToPlaylistScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(AddVideosToPlaylistScenario, "__init__",
                          lambda self, *a, **kw: None):
            scenario = AddVideosToPlaylistScenario.__new__(
                AddVideosToPlaylistScenario
            )
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = _execute_query_in_path
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_pass_both_videos_added(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      playlists=[{"id": 10, "name": "My Playlist"}],
                      videos=[{"id": 1, "title": "Video A"},
                              {"id": 2, "title": "Video B"}],
                      playlist_videos=[{"id": 1, "playlist_id": 10, "video_id": 1},
                                       {"id": 2, "playlist_id": 10, "video_id": 2}])
            scenario = self._make_scenario(
                video_1="Video A", video_2="Video B", playlist_name="My Playlist"
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["video_1_added"])
            self.assertTrue(checks["video_2_added"])

    def test_fail_one_video_missing(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      playlists=[{"id": 10, "name": "My Playlist"}],
                      videos=[{"id": 1, "title": "Video A"},
                              {"id": 2, "title": "Video B"}],
                      playlist_videos=[{"id": 1, "playlist_id": 10, "video_id": 1}])
            scenario = self._make_scenario(
                video_1="Video A", video_2="Video B", playlist_name="My Playlist"
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["video_1_added"])
            self.assertFalse(checks["video_2_added"])

    def test_fail_neither_added(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      playlists=[{"id": 10, "name": "My Playlist"}],
                      videos=[{"id": 1, "title": "Video A"},
                              {"id": 2, "title": "Video B"}])
            scenario = self._make_scenario(
                video_1="Video A", video_2="Video B", playlist_name="My Playlist"
            )
            checks = scenario._get_checks(d)
            self.assertFalse(checks["video_1_added"])
            self.assertFalse(checks["video_2_added"])

    def test_playlist_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      videos=[{"id": 1, "title": "Video A"},
                              {"id": 2, "title": "Video B"}])
            scenario = self._make_scenario(
                video_1="Video A", video_2="Video B", playlist_name="Nonexistent"
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_video_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, playlists=[{"id": 10, "name": "My Playlist"}])
            scenario = self._make_scenario(
                video_1="Missing", video_2="Also Missing",
                playlist_name="My Playlist"
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_case_insensitive_matching(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      playlists=[{"id": 10, "name": "My Playlist"}],
                      videos=[{"id": 1, "title": "Video A"},
                              {"id": 2, "title": "Video B"}],
                      playlist_videos=[{"id": 1, "playlist_id": 10, "video_id": 1},
                                       {"id": 2, "playlist_id": 10, "video_id": 2}])
            scenario = self._make_scenario(
                video_1="video a", video_2="VIDEO B", playlist_name="my playlist"
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["video_1_added"])
            self.assertTrue(checks["video_2_added"])


if __name__ == "__main__":
    unittest.main()
