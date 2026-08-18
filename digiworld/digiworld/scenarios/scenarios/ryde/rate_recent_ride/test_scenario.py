# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for RateRecentRideScenario."""

import digiworld.scenarios.scenarios.ryde.test_helpers  # noqa: F401

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import RateRecentRideScenario

TABLES_SQL = [
    "CREATE TABLE rides (id INTEGER PRIMARY KEY, user_id INTEGER, "
    "driver_id INTEGER, pickup_location TEXT, drop_location TEXT, "
    "status TEXT, start_time TEXT, end_time TEXT, distance_km REAL, "
    "fare_amount REAL, feedback_submitted INTEGER DEFAULT 0, "
    "payment_mode TEXT)",
    "CREATE TABLE feedback (id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "ride_id INTEGER, rating INTEGER, comment TEXT, submitted_at TEXT)",
]

RIDE_INSERT = (
    "INSERT INTO rides (id, user_id, driver_id, pickup_location, "
    "drop_location, status, start_time, end_time, distance_km, "
    "fare_amount, feedback_submitted, payment_mode) "
    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
)

FEEDBACK_INSERT = (
    "INSERT INTO feedback (ride_id, rating, comment, submitted_at) "
    "VALUES (?, ?, ?, ?)"
)


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_scenario(**kwargs):
    with patch.object(
        RateRecentRideScenario, "__init__", lambda self, *a, **kw: None
    ):
        scenario = RateRecentRideScenario.__new__(RateRecentRideScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = kwargs.pop("agent_answer", "")
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


_RIDE = (
    1, 1, 10, "Home", "Office", "completed",
    "2025-01-01 08:00", "2025-01-01 08:30",
    12.5, 25.0, 0, "cash",
)


class TestRateRecentRideScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, rides, feedback=None, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in TABLES_SQL:
            conn.execute(sql)
        for params in rides:
            conn.execute(RIDE_INSERT, params)
        for params in feedback or []:
            conn.execute(FEEDBACK_INSERT, params)
        conn.commit()
        conn.close()

    def test_pass_correct_feedback(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [_RIDE])
            self._make_db(final_dir, [_RIDE], feedback=[
                (1, 5, "Great ride!", "2025-01-01 09:00"),
            ])
            scenario = _make_scenario(
                rating="5",
                comment="Great ride!",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["feedback_submitted"])
            self.assertTrue(checks["rating_matches"])
            self.assertTrue(checks["comment_matches"])

    def test_fail_no_feedback(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [_RIDE])
            self._make_db(final_dir, [_RIDE])
            scenario = _make_scenario(
                rating="5",
                comment="Great ride!",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["feedback_submitted"])
            self.assertFalse(checks["rating_matches"])
            self.assertFalse(checks["comment_matches"])

    def test_fail_wrong_rating(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [_RIDE])
            self._make_db(final_dir, [_RIDE], feedback=[
                (1, 3, "Great ride!", "2025-01-01 09:00"),
            ])
            scenario = _make_scenario(
                rating="5",
                comment="Great ride!",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["feedback_submitted"])
            self.assertFalse(checks["rating_matches"])
            self.assertTrue(checks["comment_matches"])

    def test_fail_wrong_comment(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [_RIDE])
            self._make_db(final_dir, [_RIDE], feedback=[
                (1, 5, "Terrible experience", "2025-01-01 09:00"),
            ])
            scenario = _make_scenario(
                rating="5",
                comment="Great ride!",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["feedback_submitted"])
            self.assertTrue(checks["rating_matches"])
            self.assertFalse(checks["comment_matches"])

    def test_fail_no_rides(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [])
            self._make_db(final_dir, [])
            scenario = _make_scenario(
                rating="5",
                comment="Great ride!",
                initial_state_path=init_dir,
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)

    def test_selects_most_recent_ride(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            ride_old = (
                10, 1, 10, "A", "B", "completed",
                "2025-01-01 08:00", "2025-01-01 08:30",
                5.0, 10.0, 0, "cash",
            )
            ride_new = (
                20, 1, 11, "C", "D", "completed",
                "2025-01-02 10:00", "2025-01-02 10:45",
                8.0, 18.0, 0, "card",
            )
            self._make_db(init_dir, [ride_old, ride_new])
            self._make_db(final_dir, [ride_old, ride_new], feedback=[
                (20, 4, "Smooth ride", "2025-01-02 11:00"),
            ])
            scenario = _make_scenario(
                rating="4",
                comment="Smooth ride",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["feedback_submitted"])
            self.assertTrue(checks["rating_matches"])
            self.assertTrue(checks["comment_matches"])


if __name__ == "__main__":
    unittest.main()
