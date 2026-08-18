# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PlayGenrePlaylistScenario."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock

from .scenario import PlayGenrePlaylistScenario

CATEGORIES_SQL = (
    "CREATE TABLE categories ("
    "id INTEGER PRIMARY KEY, category_id TEXT, name TEXT, color TEXT, "
    "subcategories TEXT, description TEXT, type TEXT, "
    "created_at TEXT, updated_at TEXT)"
)

SONGS_SQL = (
    "CREATE TABLE songs ("
    "id INTEGER PRIMARY KEY, title TEXT, artist_id INTEGER, album_id INTEGER, "
    "duration INTEGER, categories TEXT, audio_url TEXT, cover_art TEXT, "
    "play_count INTEGER, rating REAL, created_at TEXT, updated_at TEXT)"
)


def _make_db(tmp_dir, categories, songs):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(CATEGORIES_SQL)
    conn.execute(SONGS_SQL)
    for cat in categories:
        conn.execute(
            "INSERT INTO categories (id, name) VALUES (?, ?)",
            (cat["id"], cat["name"]),
        )
    for song in songs:
        conn.execute(
            "INSERT INTO songs (id, title, categories) VALUES (?, ?, ?)",
            (song["id"], song.get("title", f"Song {song['id']}"),
             json.dumps(song["categories"])),
        )
    conn.commit()
    conn.close()


def _make_rootstore(tmp_dir, current_song_id):
    rootstore = {
        "musicStore": {
            "currentSongId": current_song_id,
            "queueState": {
                "sourceType": "category" if current_song_id else "none",
                "sourceId": -1,
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


class _StubScenario(PlayGenrePlaylistScenario):
    def __init__(self):
        pass


class TestPlayGenrePlaylistScenario(unittest.TestCase):

    CATEGORIES = [
        {"id": 1, "name": "Rock"},
        {"id": 7, "name": "Electronic"},
    ]

    SONGS = [
        {"id": 1, "categories": ["7", "1", "8"]},
        {"id": 2, "categories": ["3"]},
    ]

    def _make_scenario(self, genre):
        scenario = _StubScenario()
        scenario.genre = genre
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

    def test_pass_song_matches_genre(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.CATEGORIES, self.SONGS)
            _make_rootstore(d, current_song_id=1)
            scenario = self._make_scenario("Electronic")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["song_playing"])
            self.assertTrue(checks["correct_genre"])

    def test_pass_rock_genre(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.CATEGORIES, self.SONGS)
            _make_rootstore(d, current_song_id=1)
            scenario = self._make_scenario("Rock")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["song_playing"])
            self.assertTrue(checks["correct_genre"])

    def test_fail_song_wrong_genre(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.CATEGORIES, self.SONGS)
            _make_rootstore(d, current_song_id=2)
            scenario = self._make_scenario("Electronic")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["song_playing"])
            self.assertFalse(checks["correct_genre"])

    def test_fail_no_song_playing(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.CATEGORIES, self.SONGS)
            _make_rootstore(d, current_song_id=None)
            scenario = self._make_scenario("Rock")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["song_playing"])
            self.assertFalse(checks["correct_genre"])

    def test_genre_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.CATEGORIES, self.SONGS)
            _make_rootstore(d, current_song_id=1)
            scenario = self._make_scenario("Polka")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
