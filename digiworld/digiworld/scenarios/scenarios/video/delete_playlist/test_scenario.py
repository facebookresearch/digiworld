# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for DeletePlaylistScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import DeletePlaylistScenario


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
            "INSERT INTO playlists (id, user_id, name) VALUES (?, ?, ?)",
            (pl["id"], pl.get("user_id", 1), pl["name"]),
        )
    conn.commit()
    conn.close()


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


class TestDeletePlaylistScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(DeletePlaylistScenario, "__init__",
                          lambda self, *a, **kw: None):
            scenario = DeletePlaylistScenario.__new__(DeletePlaylistScenario)
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = _execute_query_in_path
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_pass_playlist_deleted(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, playlists=[{"id": 1, "name": "Old Playlist"}])
            _make_db(final_dir)
            scenario = self._make_scenario(
                playlist_name="Old Playlist", initial_state_path=init_dir
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["playlist_deleted"])

    def test_fail_playlist_still_exists(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, playlists=[{"id": 1, "name": "Old Playlist"}])
            _make_db(final_dir, playlists=[{"id": 1, "name": "Old Playlist"}])
            scenario = self._make_scenario(
                playlist_name="Old Playlist", initial_state_path=init_dir
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["playlist_deleted"])

    def test_playlist_never_existed_raises(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir)
            _make_db(final_dir)
            scenario = self._make_scenario(
                playlist_name="Nonexistent", initial_state_path=init_dir
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, playlists=[{"id": 1, "name": "Chill Vibes"}])
            _make_db(final_dir)
            scenario = self._make_scenario(
                playlist_name="chill vibes", initial_state_path=init_dir
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["playlist_deleted"])


if __name__ == "__main__":
    unittest.main()
