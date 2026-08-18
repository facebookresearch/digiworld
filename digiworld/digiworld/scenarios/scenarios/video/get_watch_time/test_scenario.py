# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetWatchTimeScenario."""

import datetime
import os
import sqlite3
import tempfile
import unittest

from .scenario import GetWatchTimeScenario

HISTORY_SQL = (
    "CREATE TABLE history ("
    "id INTEGER PRIMARY KEY, user_id INTEGER, video_id INTEGER, "
    "watched_at TEXT)"
)


def _make_db(tmp_dir, history_rows):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(HISTORY_SQL)
    for row in history_rows:
        conn.execute(
            "INSERT INTO history (id, user_id, video_id, watched_at) "
            "VALUES (?, ?, ?, ?)",
            (row["id"], row["user_id"], row["video_id"], row["watched_at"]),
        )
    conn.commit()
    conn.close()


class _StubScenario(GetWatchTimeScenario):
    def __init__(self):
        pass


class TestGetWatchTime(unittest.TestCase):
    HISTORY = [
        {"id": 1, "user_id": 1, "video_id": 10, "watched_at": "2026-01-15 10:30:00"},
        {"id": 2, "user_id": 1, "video_id": 20, "watched_at": "2026-02-01 14:00:00"},
        {"id": 3, "user_id": 1, "video_id": 30, "watched_at": "2026-02-20 09:15:00"},
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

    def test_oldest_correct_date(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.HISTORY)
            scenario = self._make_scenario(
                "oldest", "You watched it on January 15, 2026."
            )
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_newest_correct_date(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.HISTORY)
            scenario = self._make_scenario(
                "newest", "The date was 2026-02-20."
            )
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_date_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.HISTORY)
            scenario = self._make_scenario(
                "oldest", "You watched it on February 1, 2026."
            )
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_empty_answer_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.HISTORY)
            scenario = self._make_scenario("oldest", "")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_no_history_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [])
            scenario = self._make_scenario("oldest", "any date")
            scenario.initial_state_path = d
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_iso_format_date(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.HISTORY)
            scenario = self._make_scenario("newest", "2026-02-20")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_query_returns_correct_date_object(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, self.HISTORY)
            scenario = self._make_scenario("oldest")
            scenario.initial_state_path = d
            result = scenario._query_watched_date()
            self.assertEqual(result, datetime.date(2026, 1, 15))


if __name__ == "__main__":
    unittest.main()
