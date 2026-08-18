# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ExtendParkingSessionScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ExtendParkingSessionScenario

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

_VEHICLES = [(1, 1, "Thunder", "Toyota", "Camry", "Blue", "THND3R")]
_ZONES = [(1, "Downtown Lot", "DWN001")]


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_scenario(**kwargs):
    with patch.object(
        ExtendParkingSessionScenario, "__init__", lambda self, *a, **kw: None
    ):
        scenario = ExtendParkingSessionScenario.__new__(ExtendParkingSessionScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = ""
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestExtendParkingSessionScenario(unittest.TestCase):
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
                "(id, user_id, vehicle_id, parking_zone_id, planned_duration_minutes, status) "
                "VALUES (?, ?, ?, ?, ?, ?)", h,
            )
        conn.commit()
        conn.close()

    def test_duration_extended_passes(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(
                initial_dir,
                vehicles=_VEHICLES, zones=_ZONES,
                history=[(1, 1, 1, 1, 60, "active")],
            )
            self._make_db(
                final_dir,
                vehicles=_VEHICLES, zones=_ZONES,
                history=[(1, 1, 1, 1, 90, "active")],
            )
            scenario = _make_scenario(
                vehicle="Thunder", zone_code="DWN001", minutes="30",
                initial_state_path=initial_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["duration_extended"])
            self.assertTrue(checks["session_still_active"])

    def test_duration_not_extended_fails(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(
                initial_dir,
                vehicles=_VEHICLES, zones=_ZONES,
                history=[(1, 1, 1, 1, 60, "active")],
            )
            self._make_db(
                final_dir,
                vehicles=_VEHICLES, zones=_ZONES,
                history=[(1, 1, 1, 1, 60, "active")],
            )
            scenario = _make_scenario(
                vehicle="Thunder", zone_code="DWN001", minutes="30",
                initial_state_path=initial_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["duration_extended"])

    def test_session_ended_fails(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(
                initial_dir,
                vehicles=_VEHICLES, zones=_ZONES,
                history=[(1, 1, 1, 1, 60, "active")],
            )
            self._make_db(
                final_dir,
                vehicles=_VEHICLES, zones=_ZONES,
                history=[(1, 1, 1, 1, 90, "completed")],
            )
            scenario = _make_scenario(
                vehicle="Thunder", zone_code="DWN001", minutes="30",
                initial_state_path=initial_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["duration_extended"])
            self.assertFalse(checks["session_still_active"])

    def test_vehicle_not_found_raises(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(initial_dir, zones=_ZONES)
            self._make_db(final_dir, zones=_ZONES)
            scenario = _make_scenario(
                vehicle="Ghost", zone_code="DWN001", minutes="30",
                initial_state_path=initial_dir,
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)

    def test_zone_not_found_raises(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(initial_dir, vehicles=_VEHICLES)
            self._make_db(final_dir, vehicles=_VEHICLES)
            scenario = _make_scenario(
                vehicle="Thunder", zone_code="NOPE99", minutes="30",
                initial_state_path=initial_dir,
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)

    def test_no_initial_history_raises(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(initial_dir, vehicles=_VEHICLES, zones=_ZONES)
            self._make_db(
                final_dir,
                vehicles=_VEHICLES, zones=_ZONES,
                history=[(1, 1, 1, 1, 90, "active")],
            )
            scenario = _make_scenario(
                vehicle="Thunder", zone_code="DWN001", minutes="30",
                initial_state_path=initial_dir,
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)


if __name__ == "__main__":
    unittest.main()
