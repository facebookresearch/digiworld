# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for DeletePlaylistScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import DeletePlaylistScenario


PLAYLISTS_SQL = [
    "CREATE TABLE playlists ("
    "id INTEGER PRIMARY KEY, name TEXT, description TEXT, user_id INTEGER, "
    "categories TEXT, cover_art TEXT, song_ids TEXT, created_at TEXT, "
    "updated_at TEXT)"
]


class TestDeletePlaylistScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in PLAYLISTS_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(DeletePlaylistScenario, '__init__', lambda self, *a, **kw: None):
            scenario = DeletePlaylistScenario.__new__(DeletePlaylistScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, initial_dir, final_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = initial_dir

    def test_pass_playlist_deleted(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO playlists (id, name, user_id) VALUES (?, ?, ?)",
                 (1, "Chill Vibes", 1)),
            ])
            self._make_db(final_dir, [])
            scenario = self._make_scenario(name="Chill Vibes")
            self._setup_state_manager(scenario, init_dir, final_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["playlist_deleted"])

    def test_fail_playlist_still_exists(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO playlists (id, name, user_id) VALUES (?, ?, ?)",
                 (1, "Chill Vibes", 1)),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO playlists (id, name, user_id) VALUES (?, ?, ?)",
                 (1, "Chill Vibes", 1)),
            ])
            scenario = self._make_scenario(name="Chill Vibes")
            self._setup_state_manager(scenario, init_dir, final_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["playlist_deleted"])

    def test_fail_playlist_never_existed_raises(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [])
            self._make_db(final_dir, [])
            scenario = self._make_scenario(name="Nonexistent")
            self._setup_state_manager(scenario, init_dir, final_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)


if __name__ == "__main__":
    unittest.main()
