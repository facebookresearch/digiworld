# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PlayPlaylistScenario."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import PlayPlaylistScenario

PLAYLISTS_SQL = (
    "CREATE TABLE playlists ("
    "id INTEGER PRIMARY KEY, name TEXT, description TEXT, user_id INTEGER, "
    "categories TEXT, cover_art TEXT, song_ids TEXT, "
    "created_at TEXT, updated_at TEXT)"
)


def _make_db(tmp_dir, playlists):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(PLAYLISTS_SQL)
    for pl in playlists:
        conn.execute(
            "INSERT INTO playlists (id, name, description, user_id, song_ids) "
            "VALUES (?, ?, ?, ?, ?)",
            (pl["id"], pl["name"], pl.get("description", ""), pl.get("user_id", 1),
             json.dumps(pl.get("song_ids", [1, 2, 3]))),
        )
    conn.commit()
    conn.close()


def _make_rootstore(tmp_dir, current_song_id, queue_source_type, queue_source_id):
    rootstore = {
        "musicStore": {
            "currentSongId": current_song_id,
            "queueState": {
                "sourceType": queue_source_type,
                "sourceId": queue_source_id,
                "queueSongIds": [],
                "currentIndex": 0,
            },
            "playbackState": {"isPlaying": True, "progress": 0, "duration": 200},
            "playlists": [],
            "searchResults": {"songIds": [], "artistIds": [], "albumIds": []},
            "searchQuery": "",
        }
    }
    with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(PlayPlaylistScenario):
    def __init__(self):
        pass


class TestPlayPlaylistScenario(unittest.TestCase):

    def _make_scenario(self, playlist_name):
        scenario = _StubScenario()
        scenario.playlist_name = playlist_name
        scenario.current_user_id = 1
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = self._execute_query_in_path
        return scenario

    @staticmethod
    def _execute_query_in_path(query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result

    def test_pass_correct_playlist_playing(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [{"id": 5, "name": "Chill Vibes"}])
            _make_rootstore(d, current_song_id=1, queue_source_type="playlist", queue_source_id=5)
            scenario = self._make_scenario("Chill Vibes")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["song_playing"])
            self.assertTrue(checks["queue_source_is_playlist"])
            self.assertTrue(checks["correct_playlist"])

    def test_fail_no_song_playing(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [{"id": 5, "name": "Chill Vibes"}])
            _make_rootstore(d, current_song_id=None, queue_source_type="none", queue_source_id=-1)
            scenario = self._make_scenario("Chill Vibes")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["song_playing"])

    def test_fail_wrong_source_type(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [{"id": 5, "name": "Chill Vibes"}])
            _make_rootstore(d, current_song_id=1, queue_source_type="category", queue_source_id=5)
            scenario = self._make_scenario("Chill Vibes")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["song_playing"])
            self.assertFalse(checks["queue_source_is_playlist"])

    def test_fail_wrong_playlist_id(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [{"id": 5, "name": "Chill Vibes"}, {"id": 9, "name": "Other"}])
            _make_rootstore(d, current_song_id=1, queue_source_type="playlist", queue_source_id=9)
            scenario = self._make_scenario("Chill Vibes")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["song_playing"])
            self.assertTrue(checks["queue_source_is_playlist"])
            self.assertFalse(checks["correct_playlist"])

    def test_playlist_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [])
            _make_rootstore(d, current_song_id=1, queue_source_type="playlist", queue_source_id=1)
            scenario = self._make_scenario("Nonexistent")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_playlist_owned_by_different_user_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [{"id": 5, "name": "Chill Vibes", "user_id": 99}])
            _make_rootstore(d, current_song_id=1, queue_source_type="playlist", queue_source_id=5)
            scenario = self._make_scenario("Chill Vibes")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
