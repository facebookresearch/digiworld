# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CreatePlaylistScenario."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock

from .scenario import CreatePlaylistScenario

PLAYLISTS_SQL = (
    "CREATE TABLE playlists ("
    "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
    "description TEXT, is_public INTEGER, shuffle INTEGER, "
    "share_url TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT)"
)


def _make_db(tmp_dir, playlists):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(PLAYLISTS_SQL)
    for pl in playlists:
        conn.execute(
            "INSERT INTO playlists (id, user_id, name, description, deleted_at) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                pl["id"],
                pl.get("user_id", 1),
                pl["name"],
                pl.get("description", ""),
                pl.get("deleted_at"),
            ),
        )
    conn.commit()
    conn.close()


class _StubScenario(CreatePlaylistScenario):
    def __init__(self):
        pass


class TestCreatePlaylist(unittest.TestCase):

    def _make_scenario(self, playlist_name, playlist_description=""):
        scenario = _StubScenario()
        scenario.playlist_name = playlist_name
        scenario.playlist_description = playlist_description
        scenario.current_user_id = 1
        scenario._execute_query_in_path = self._execute_query_in_path
        return scenario

    @staticmethod
    def _execute_query_in_path(query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result

    def test_playlist_created_with_description(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                {"id": 1, "name": "My Favorites", "description": "Best videos ever"},
            ])
            scenario = self._make_scenario("My Favorites", "Best videos ever")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["playlist_created"])
            self.assertTrue(checks["description_matches"])

    def test_playlist_created_without_description_param(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                {"id": 1, "name": "Quick List", "description": "Some desc"},
            ])
            scenario = self._make_scenario("Quick List", "")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["playlist_created"])
            self.assertTrue(checks["description_matches"])

    def test_playlist_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [])
            scenario = self._make_scenario("Missing Playlist", "desc")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["playlist_created"])
            self.assertFalse(checks["description_matches"])

    def test_wrong_description(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                {"id": 1, "name": "My Favorites", "description": "Wrong description"},
            ])
            scenario = self._make_scenario("My Favorites", "Best videos ever")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["playlist_created"])
            self.assertFalse(checks["description_matches"])

    def test_case_insensitive_name_match(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                {"id": 1, "name": "my favorites", "description": "Best videos"},
            ])
            scenario = self._make_scenario("My Favorites", "Best videos")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["playlist_created"])
            self.assertTrue(checks["description_matches"])

    def test_deleted_playlist_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                {
                    "id": 1, "name": "Deleted Playlist",
                    "description": "Gone", "deleted_at": "2026-01-01 00:00:00",
                },
            ])
            scenario = self._make_scenario("Deleted Playlist", "Gone")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["playlist_created"])
            self.assertFalse(checks["description_matches"])

    def test_different_user_playlist_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                {"id": 1, "user_id": 99, "name": "Other User", "description": "desc"},
            ])
            scenario = self._make_scenario("Other User", "desc")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["playlist_created"])


if __name__ == "__main__":
    unittest.main()
