# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PastRideDateScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import PastRideDateScenario

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
    with patch.object(PastRideDateScenario, "__init__", lambda self, *a, **kw: None):
        scenario = PastRideDateScenario.__new__(PastRideDateScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = kwargs.pop("agent_answer", "")
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestPastRideDateScenario(unittest.TestCase):

    RIDE_ROWS = [
        (1, 1, 10, "Home", "Office", "completed",
         "2026-02-10T10:00:00Z", "2026-02-10T10:30:00Z", 5.0, 10.00, 0, "card"),
        (2, 1, 11, "Office", "Mall", "completed",
         "2026-02-15T14:00:00Z", "2026-02-15T14:45:00Z", 8.0, 18.00, 0, "card"),
        (3, 1, 12, "Mall", "Home", "completed",
         "2026-02-20T08:00:00Z", "2026-02-20T08:25:00Z", 6.0, 15.00, 0, "cash"),
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

    def test_pass_most_recent(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.RIDE_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                recency="most recent",
                agent_answer="The most recent ride was on February 20, 2026",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_pass_oldest(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.RIDE_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                recency="oldest",
                agent_answer="Your oldest ride was on 2026-02-10",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_date(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.RIDE_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                recency="most recent",
                agent_answer="The ride was on January 1, 2026",
            )
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_fail_no_rides(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = _make_scenario(
                initial_state_path=d,
                recency="most recent",
                agent_answer="No rides found",
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
