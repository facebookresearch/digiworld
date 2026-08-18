# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for MostRecentRideCostScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import MostRecentRideCostScenario

RIDES_DDL = (
    "CREATE TABLE rides ("
    "id INTEGER PRIMARY KEY, user_id INTEGER, driver_id INTEGER, "
    "pickup_location TEXT, drop_location TEXT, status TEXT, "
    "start_time TEXT, end_time TEXT, distance_km REAL, fare_amount REAL, "
    "feedback_submitted INTEGER DEFAULT 0, payment_mode TEXT)"
)


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_scenario(**kwargs):
    with patch.object(MostRecentRideCostScenario, "__init__", lambda self, *a, **kw: None):
        scenario = MostRecentRideCostScenario.__new__(MostRecentRideCostScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = kwargs.pop("agent_answer", "")
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestMostRecentRideCostScenario(unittest.TestCase):

    RIDE_ROWS = [
        (1, 1, 10, "Home", "Office", "completed",
         "2026-02-10T10:00:00Z", "2026-02-10T12:00:00Z", 5.0, 12.00, 0, "card"),
        (2, 1, 11, "Office", "Mall", "completed",
         "2026-02-20T14:00:00Z", "2026-02-20T16:00:00Z", 10.0, 25.50, 0, "card"),
        (3, 1, 12, "Mall", "Home", "cancelled",
         "2026-02-22T09:00:00Z", "2026-02-22T10:00:00Z", 7.0, 30.00, 0, "cash"),
    ]

    def _make_db(self, tmp_dir, rows):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(RIDES_DDL)
        for row in rows:
            conn.execute(
                "INSERT INTO rides VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                row,
            )
        conn.commit()
        conn.close()

    def test_pass_correct_cost(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.RIDE_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                agent_answer="The most recent ride cost $25.50",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_cost(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.RIDE_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                agent_answer="The ride cost was $99.99",
            )
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_fail_no_rides(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = _make_scenario(
                initial_state_path=d,
                agent_answer="No rides found",
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_only_considers_completed(self):
        """Cancelled ride (id=3) has later end_time but should be excluded."""
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.RIDE_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                agent_answer="Your most recent completed ride cost $25.50",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

            scenario_wrong = _make_scenario(
                initial_state_path=d,
                agent_answer="The ride cost was $30.00",
            )
            checks_wrong = scenario_wrong._get_checks(d)
            self.assertFalse(checks_wrong["answer_matches"])


if __name__ == "__main__":
    unittest.main()
