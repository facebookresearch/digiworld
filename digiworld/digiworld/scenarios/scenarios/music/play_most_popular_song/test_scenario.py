# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PlayMostPopularSongScenario."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import PlayMostPopularSongScenario


SONGS_SQL = [
    "CREATE TABLE songs ("
    "id INTEGER PRIMARY KEY, title TEXT, artist_id INTEGER, album_id INTEGER, "
    "duration INTEGER, categories TEXT, audio_url TEXT, cover_art TEXT, "
    "play_count INTEGER, rating REAL, created_at TEXT, updated_at TEXT)"
]


class TestPlayMostPopularSongScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in SONGS_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(PlayMostPopularSongScenario, '__init__', lambda self, *a, **kw: None):
            scenario = PlayMostPopularSongScenario.__new__(PlayMostPopularSongScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, initial_dir, final_dir=None):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = initial_dir

    def _write_rootstore(self, state_dir, current_song_id):
        rootstore = {
            "musicStore": {
                "currentSongId": current_song_id,
                "playbackState": {"isPlaying": True, "progress": 0, "duration": 0},
                "queueState": {"sourceType": "none", "sourceId": -1, "queueSongIds": [], "currentIndex": -1},
            }
        }
        with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
            json.dump(rootstore, f)

    def test_pass_most_popular_song_playing(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 100)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (2, "Song B", 500)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (3, "Song C", 200)),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 100)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (2, "Song B", 500)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (3, "Song C", 200)),
            ])
            self._write_rootstore(final_dir, 2)
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, init_dir, final_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["correct_song_playing"])

    def test_pass_tied_most_popular(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 500)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (2, "Song B", 500)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (3, "Song C", 100)),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 500)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (2, "Song B", 500)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (3, "Song C", 100)),
            ])
            self._write_rootstore(final_dir, 1)
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, init_dir, final_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["correct_song_playing"])

    def test_fail_wrong_song_playing(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 100)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (2, "Song B", 500)),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 100)),
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (2, "Song B", 500)),
            ])
            self._write_rootstore(final_dir, 1)
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, init_dir, final_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["correct_song_playing"])

    def test_fail_no_song_playing(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 500)),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO songs (id, title, play_count) VALUES (?, ?, ?)", (1, "Song A", 500)),
            ])
            self._write_rootstore(final_dir, None)
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, init_dir, final_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["correct_song_playing"])

    def test_fail_no_songs_raises(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [])
            self._make_db(final_dir, [])
            self._write_rootstore(final_dir, None)
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, init_dir, final_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)


if __name__ == "__main__":
    unittest.main()
