# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for StopParkingSessionScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import StopParkingSessionScenario

TABLE_SQL = [
    """CREATE TABLE vehicles (
        id INTEGER PRIMARY KEY, user_id INTEGER, nickname TEXT,
        make TEXT, model TEXT, color TEXT, year INTEGER,
        plate_number TEXT UNIQUE, vehicle_type_id INTEGER,
        is_default INTEGER, created_at TEXT, updated_at TEXT, metadata TEXT
    )""",
    """CREATE TABLE parking_zones (
        id INTEGER PRIMARY KEY, name TEXT, description TEXT,
        latitude REAL, longitude REAL, zone_code TEXT UNIQUE,
        operator TEXT, zone_type TEXT, capacity INTEGER,
        rate_currency TEXT, rate_multiplier REAL, is_active INTEGER,
        created_at TEXT, updated_at TEXT, metadata TEXT
    )""",
    """CREATE TABLE parking_history (
        id INTEGER PRIMARY KEY, user_id INTEGER, vehicle_id INTEGER,
        parking_zone_id INTEGER, start_time TEXT, planned_end_time TEXT,
        actual_end_time TEXT, planned_duration_minutes INTEGER,
        actual_duration_minutes INTEGER, charged_amount REAL,
        currency TEXT, status TEXT, metadata TEXT,
        created_at TEXT, updated_at TEXT
    )""",
]


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_scenario(**kwargs):
    with patch.object(
        StopParkingSessionScenario, "__init__", lambda self, *a, **kw: None
    ):
        scenario = StopParkingSessionScenario.__new__(StopParkingSessionScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = ""
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestStopParkingSessionScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, vehicles=(), zones=(), history=()):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        for sql in TABLE_SQL:
            conn.execute(sql)
        for v in vehicles:
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, plate_number) "
                "VALUES (?, ?, ?, ?, ?, ?, ?)", v,
            )
        for z in zones:
            conn.execute(
                "INSERT INTO parking_zones (id, name, zone_code) VALUES (?, ?, ?)", z,
            )
        for h in history:
            conn.execute(
                "INSERT INTO parking_history "
                "(id, user_id, vehicle_id, parking_zone_id, status, actual_end_time) "
                "VALUES (?, ?, ?, ?, ?, ?)", h,
            )
        conn.commit()
        conn.close()

    def test_session_stopped_passes(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(
                d,
                vehicles=[(1, 1, "Thunder", "Toyota", "Camry", "Blue", "THND3R")],
                zones=[(1, "Downtown Lot", "DWN001")],
                history=[(1, 1, 1, 1, "completed", "2025-06-01T12:00:00")],
            )
            scenario = _make_scenario(vehicle="Thunder", zone_code="DWN001")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["session_completed"])
            self.assertTrue(checks["end_time_recorded"])

    def test_session_still_active_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(
                d,
                vehicles=[(1, 1, "Thunder", "Toyota", "Camry", "Blue", "THND3R")],
                zones=[(1, "Downtown Lot", "DWN001")],
                history=[(1, 1, 1, 1, "active", None)],
            )
            scenario = _make_scenario(vehicle="Thunder", zone_code="DWN001")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["session_completed"])
            self.assertFalse(checks["end_time_recorded"])

    def test_vehicle_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(
                d,
                zones=[(1, "Downtown Lot", "DWN001")],
            )
            scenario = _make_scenario(vehicle="Ghost", zone_code="DWN001")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_zone_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(
                d,
                vehicles=[(1, 1, "Thunder", "Toyota", "Camry", "Blue", "THND3R")],
            )
            scenario = _make_scenario(vehicle="Thunder", zone_code="NOPE99")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_no_history_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(
                d,
                vehicles=[(1, 1, "Thunder", "Toyota", "Camry", "Blue", "THND3R")],
                zones=[(1, "Downtown Lot", "DWN001")],
            )
            scenario = _make_scenario(vehicle="Thunder", zone_code="DWN001")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
