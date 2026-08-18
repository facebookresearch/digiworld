# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SearchForArtistScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.music.search_for_artist.scenario import (
    SearchForArtistScenario,
)


TABLES_SQL = [
    "CREATE TABLE artists ("
    "id INTEGER PRIMARY KEY, name TEXT, bio TEXT, categories TEXT, "
    "monthly_listeners INTEGER, rating REAL, profile_picture TEXT, "
    "created_at TEXT, updated_at TEXT)",
]


def _make_db(tmp_dir, artists):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    for sql in TABLES_SQL:
        conn.execute(sql)
    for a in artists:
        conn.execute(
            "INSERT INTO artists (id, name) VALUES (?, ?)",
            a,
        )
    conn.commit()
    conn.close()


def _make_rootstore(tmp_dir, search_query, search_results):
    rootstore = {
        "sessionStore": {
            "session": {"data": {"screenName": "search", "route": "/search"}},
        },
        "musicStore": {
            "playlists": [],
            "playbackState": {
                "isPlaying": False,
                "progress": 0,
                "duration": 0,
            },
            "queueState": {
                "sourceType": "none",
                "sourceId": -1,
                "queueSongIds": [],
                "currentIndex": -1,
            },
            "currentSongId": None,
            "searchResults": search_results,
            "searchQuery": search_query,
        },
    }
    with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(SearchForArtistScenario):
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


class TestSearchForArtistScenario(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1

    def test_query_matches_and_artist_in_results(self):
        _make_db(self.tmpdir, [(1, "Maya Solari")])
        _make_rootstore(
            self.tmpdir,
            search_query="Maya Solari",
            search_results={"songIds": [1, 2], "artistIds": [1], "albumIds": []},
        )
        self.scenario.artist_name = "Maya Solari"
        _setup_execute(self.scenario, self.tmpdir)

        checks = self.scenario._get_checks(self.tmpdir)
        self.assertTrue(checks["search_query_matches"])
        self.assertTrue(checks["artist_in_results"])

    def test_empty_search_query(self):
        _make_db(self.tmpdir, [(1, "Maya Solari")])
        _make_rootstore(
            self.tmpdir,
            search_query="",
            search_results={"songIds": [], "artistIds": [], "albumIds": []},
        )
        self.scenario.artist_name = "Maya Solari"
        _setup_execute(self.scenario, self.tmpdir)

        checks = self.scenario._get_checks(self.tmpdir)
        self.assertFalse(checks["search_query_matches"])
        self.assertFalse(checks["artist_in_results"])

    def test_query_does_not_match(self):
        _make_db(self.tmpdir, [(1, "Maya Solari")])
        _make_rootstore(
            self.tmpdir,
            search_query="Jaxon Reed",
            search_results={"songIds": [], "artistIds": [1], "albumIds": []},
        )
        self.scenario.artist_name = "Maya Solari"
        _setup_execute(self.scenario, self.tmpdir)

        checks = self.scenario._get_checks(self.tmpdir)
        self.assertFalse(checks["search_query_matches"])
        self.assertTrue(checks["artist_in_results"])

    def test_artist_not_in_results(self):
        _make_db(self.tmpdir, [(1, "Maya Solari"), (2, "The Ember Lantern")])
        _make_rootstore(
            self.tmpdir,
            search_query="Maya Solari",
            search_results={"songIds": [], "artistIds": [2], "albumIds": []},
        )
        self.scenario.artist_name = "Maya Solari"
        _setup_execute(self.scenario, self.tmpdir)

        checks = self.scenario._get_checks(self.tmpdir)
        self.assertTrue(checks["search_query_matches"])
        self.assertFalse(checks["artist_in_results"])

    def test_artist_not_found_raises(self):
        _make_db(self.tmpdir, [])
        _make_rootstore(
            self.tmpdir,
            search_query="Unknown",
            search_results={"songIds": [], "artistIds": [], "albumIds": []},
        )
        self.scenario.artist_name = "Unknown Artist"
        _setup_execute(self.scenario, self.tmpdir)

        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.tmpdir)


if __name__ == "__main__":
    unittest.main()
