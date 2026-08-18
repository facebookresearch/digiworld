# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CountWatchHistoryScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock

from digiworld.scenarios.scenarios.video.count_watch_history.scenario import (
    CountWatchHistoryScenario,
)

HISTORY_SQL = (
    "CREATE TABLE history ("
    "id INTEGER PRIMARY KEY, user_id INTEGER, video_id INTEGER, watched_at TEXT)"
)


def _make_db(tmp_dir, history_rows):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(HISTORY_SQL)
    for row in history_rows:
        conn.execute(
            "INSERT INTO history (id, user_id, video_id, watched_at) "
            "VALUES (?, ?, ?, ?)",
            row,
        )
    conn.commit()
    conn.close()


class _StubScenario(CountWatchHistoryScenario):
    def __init__(self):
        pass


class TestCountWatchHistory(unittest.TestCase):

    @staticmethod
    def _execute_query_in_path(query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result

    def _make_scenario(self, agent_answer=""):
        scenario = _StubScenario()
        scenario.current_user_id = 1
        scenario.agent_answer = agent_answer
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = self._execute_query_in_path
        return scenario

    def test_correct_count_passes(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                (1, 1, 10, "2026-01-01"),
                (2, 1, 20, "2026-01-02"),
                (3, 1, 30, "2026-01-03"),
            ])
            scenario = self._make_scenario("You have 3 videos in your history.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_count_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                (1, 1, 10, "2026-01-01"),
                (2, 1, 20, "2026-01-02"),
            ])
            scenario = self._make_scenario("You have 5 videos in your history.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_filters_by_user(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [
                (1, 1, 10, "2026-01-01"),
                (2, 2, 20, "2026-01-02"),
                (3, 1, 30, "2026-01-03"),
            ])
            scenario = self._make_scenario("There are 2 videos.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_zero_count(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, [])
            scenario = self._make_scenario("You have 0 videos in history.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
