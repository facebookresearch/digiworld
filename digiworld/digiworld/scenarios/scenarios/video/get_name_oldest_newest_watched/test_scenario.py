# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetNameOldestNewestWatchedScenario."""

import os
import sqlite3
import tempfile
import unittest

from .scenario import GetNameOldestNewestWatchedScenario

SCHEMA_SQL = [
    (
        "CREATE TABLE history ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, video_id INTEGER, "
        "watched_at TEXT)"
    ),
    (
        "CREATE TABLE videos ("
        "id INTEGER PRIMARY KEY, channel_id INTEGER, title TEXT, "
        "description TEXT, video_url TEXT, category_id INTEGER, "
        "thumbnail_url TEXT, duration INTEGER, visibility TEXT, "
        "status TEXT, view_count INTEGER, like_count INTEGER, "
        "comment_count INTEGER, is_comments_enabled INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    ),
]


def _make_db(tmp_dir, videos, history_rows):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    for sql in SCHEMA_SQL:
        conn.execute(sql)
    for v in videos:
        conn.execute(
            "INSERT INTO videos (id, title, status) VALUES (?, ?, ?)",
            (v["id"], v["title"], "active"),
        )
    for h in history_rows:
        conn.execute(
            "INSERT INTO history (id, user_id, video_id, watched_at) "
            "VALUES (?, ?, ?, ?)",
            (h["id"], h["user_id"], h["video_id"], h["watched_at"]),
        )
    conn.commit()
    conn.close()


class _StubScenario(GetNameOldestNewestWatchedScenario):
    def __init__(self):
        pass


class TestGetNameOldestNewestWatched(unittest.TestCase):
    VIDEOS = [
        {"id": 10, "title": "Ancient History Documentary"},
        {"id": 20, "title": "Cooking 101"},
        {"id": 30, "title": "Latest Tech Review"},
    ]
    HISTORY = [
        {"id": 1, "user_id": 1, "video_id": 10, "watched_at": "2026-01-01 08:00:00"},
        {"id": 2, "user_id": 1, "video_id": 20, "watched_at": "2026-01-05 12:00:00"},
        {"id": 3, "user_id": 1, "video_id": 30, "watched_at": "2026-01-10 18:00:00"},
    ]

    def _make_scenario(self, order, agent_answer=""):
        scenario = _StubScenario()
        scenario.order = order
        scenario.current_user_id = 1
        scenario.agent_answer = agent_answer
        scenario._execute_query_in_path = self._execute_query_in_path
        return scenario

    @staticmethod
    def _execute_query_in_path(query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result

    def test_oldest_correct_answer(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.VIDEOS, self.HISTORY)
            scenario = self._make_scenario(
                "oldest", "The oldest video is Ancient History Documentary."
            )
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_newest_correct_answer(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.VIDEOS, self.HISTORY)
            scenario = self._make_scenario(
                "newest", "It was Latest Tech Review."
            )
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_answer_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.VIDEOS, self.HISTORY)
            scenario = self._make_scenario(
                "oldest", "I think it was Cooking 101."
            )
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_empty_answer_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.VIDEOS, self.HISTORY)
            scenario = self._make_scenario("oldest", "")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_no_history_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.VIDEOS, [])
            scenario = self._make_scenario("oldest", "anything")
            scenario.initial_state_path = d
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.VIDEOS, self.HISTORY)
            scenario = self._make_scenario(
                "oldest", "ancient history documentary"
            )
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
