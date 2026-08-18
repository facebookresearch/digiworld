# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PlayArtistScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.music.play_artist.scenario import (
    PlayArtistScenario,
)


TABLES_SQL = [
    "CREATE TABLE artists ("
    "id INTEGER PRIMARY KEY, name TEXT, bio TEXT, categories TEXT, "
    "monthly_listeners INTEGER, rating REAL, profile_picture TEXT, "
    "created_at TEXT, updated_at TEXT)",
    "CREATE TABLE songs ("
    "id INTEGER PRIMARY KEY, title TEXT, artist_id INTEGER, album_id INTEGER, "
    "duration INTEGER, categories TEXT, audio_url TEXT, cover_art TEXT, "
    "play_count INTEGER, rating REAL, created_at TEXT, updated_at TEXT)",
]


def _make_db(tmp_dir, artists, songs):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    for sql in TABLES_SQL:
        conn.execute(sql)
    for a in artists:
        conn.execute(
            "INSERT INTO artists (id, name) VALUES (?, ?)",
            a,
        )
    for s in songs:
        conn.execute(
            "INSERT INTO songs (id, title, artist_id) VALUES (?, ?, ?)",
            s,
        )
    conn.commit()
    conn.close()


def _make_rootstore(tmp_dir, current_song_id):
    rootstore = {
        "sessionStore": {
            "session": {"data": {"screenName": "home", "route": "/home"}},
        },
        "musicStore": {
            "playlists": [],
            "playbackState": {
                "isPlaying": current_song_id is not None,
                "progress": 0,
                "duration": 0,
            },
            "queueState": {
                "sourceType": "none",
                "sourceId": -1,
                "queueSongIds": [],
                "currentIndex": -1,
            },
            "currentSongId": current_song_id,
            "searchResults": {"songIds": [], "artistIds": [], "albumIds": []},
            "searchQuery": "",
        },
    }
    with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(PlayArtistScenario):
    def __init__(self):
        pass


def _setup_execute(scenario, state_dir):
    def execute_query_in_path(query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result

    scenario._execute_query_in_path = execute_query_in_path


class TestPlayArtistScenario(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1

    def test_correct_artist_playing(self):
        _make_db(self.tmpdir, [(1, "Maya Solari")], [(10, "Sunrise", 1)])
        _make_rootstore(self.tmpdir, current_song_id=10)
        self.scenario.artist_name = "Maya Solari"
        _setup_execute(self.scenario, self.tmpdir)

        checks = self.scenario._get_checks(self.tmpdir)
        self.assertTrue(checks["song_playing"])
        self.assertTrue(checks["correct_artist"])

    def test_wrong_artist_playing(self):
        _make_db(
            self.tmpdir,
            [(1, "Maya Solari"), (2, "The Ember Lantern")],
            [(10, "Sunrise", 1), (20, "Lantern Glow", 2)],
        )
        _make_rootstore(self.tmpdir, current_song_id=20)
        self.scenario.artist_name = "Maya Solari"
        _setup_execute(self.scenario, self.tmpdir)

        checks = self.scenario._get_checks(self.tmpdir)
        self.assertTrue(checks["song_playing"])
        self.assertFalse(checks["correct_artist"])

    def test_no_song_playing(self):
        _make_db(self.tmpdir, [(1, "Maya Solari")], [(10, "Sunrise", 1)])
        _make_rootstore(self.tmpdir, current_song_id=None)
        self.scenario.artist_name = "Maya Solari"
        _setup_execute(self.scenario, self.tmpdir)

        checks = self.scenario._get_checks(self.tmpdir)
        self.assertFalse(checks["song_playing"])
        self.assertFalse(checks["correct_artist"])

    def test_artist_not_found_raises(self):
        _make_db(self.tmpdir, [], [])
        _make_rootstore(self.tmpdir, current_song_id=None)
        self.scenario.artist_name = "Unknown Artist"
        _setup_execute(self.scenario, self.tmpdir)

        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.tmpdir)


if __name__ == "__main__":
    unittest.main()
