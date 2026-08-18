# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ViewOldestNewestHistoryScenario."""

import json
import os
import sqlite3
import tempfile
import unittest

from .scenario import ViewOldestNewestHistoryScenario

HISTORY_SQL = (
    "CREATE TABLE history ("
    "id INTEGER PRIMARY KEY, user_id INTEGER, video_id INTEGER, "
    "watched_at TEXT)"
)

VIDEOS_SQL = (
    "CREATE TABLE videos ("
    "id INTEGER PRIMARY KEY, title TEXT, status TEXT)"
)

_DEFAULT_VIDEOS = [
    {"id": 10, "title": "Video A", "status": "active"},
    {"id": 20, "title": "Video B", "status": "active"},
    {"id": 30, "title": "Video C", "status": "active"},
]


def _make_db(tmp_dir, history_rows, videos=None):
    if videos is None:
        videos = _DEFAULT_VIDEOS
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(HISTORY_SQL)
    conn.execute(VIDEOS_SQL)
    for v in videos:
        conn.execute(
            "INSERT INTO videos (id, title, status) VALUES (?, ?, ?)",
            (v["id"], v["title"], v["status"]),
        )
    for row in history_rows:
        conn.execute(
            "INSERT INTO history (id, user_id, video_id, watched_at) "
            "VALUES (?, ?, ?, ?)",
            (row["id"], row["user_id"], row["video_id"], row["watched_at"]),
        )
    conn.commit()
    conn.close()


def _make_rootstore(tmp_dir, current_video_id):
    rootstore = {
        "videoStore": {
            "playbackState": {
                "currentVideoId": current_video_id,
                "isPlaying": True,
                "progress": 0,
                "duration": 300,
            },
        },
    }
    with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ViewOldestNewestHistoryScenario):
    def __init__(self):
        pass


class TestViewOldestNewestHistory(unittest.TestCase):
    HISTORY = [
        {"id": 1, "user_id": 1, "video_id": 10, "watched_at": "2026-01-01 08:00:00"},
        {"id": 2, "user_id": 1, "video_id": 20, "watched_at": "2026-01-05 12:00:00"},
        {"id": 3, "user_id": 1, "video_id": 30, "watched_at": "2026-01-10 18:00:00"},
    ]

    def _make_scenario(self, order):
        scenario = _StubScenario()
        scenario.order = order
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

    def test_oldest_correct_video(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _make_db(initial, self.HISTORY)
            _make_rootstore(final, current_video_id=10)
            scenario = self._make_scenario("oldest")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_newest_correct_video(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _make_db(initial, self.HISTORY)
            _make_rootstore(final, current_video_id=30)
            scenario = self._make_scenario("newest")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_wrong_video_fails(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _make_db(initial, self.HISTORY)
            _make_rootstore(final, current_video_id=20)
            scenario = self._make_scenario("oldest")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertFalse(checks["correct_video_playing"])

    def test_no_video_playing_fails(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _make_db(initial, self.HISTORY)
            _make_rootstore(final, current_video_id=None)
            scenario = self._make_scenario("oldest")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertFalse(checks["correct_video_playing"])

    def test_empty_history_raises(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _make_db(initial, [])
            _make_rootstore(final, current_video_id=10)
            scenario = self._make_scenario("oldest")
            scenario.initial_state_path = initial
            with self.assertRaises(ValueError):
                scenario._get_checks(final)

    def test_missing_rootstore_fails(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _make_db(initial, self.HISTORY)
            scenario = self._make_scenario("oldest")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertFalse(checks["correct_video_playing"])


if __name__ == "__main__":
    unittest.main()
