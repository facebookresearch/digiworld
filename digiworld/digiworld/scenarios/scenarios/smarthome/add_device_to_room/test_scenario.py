# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddDeviceToRoomScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddDeviceToRoomScenario


class TestAddDeviceToRoomScenario(unittest.TestCase):

    CREATE_TABLES = [
        (
            "CREATE TABLE devices ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "device_type_id INTEGER, room_id INTEGER, status TEXT, "
            "is_on INTEGER, properties TEXT, battery INTEGER, "
            "signal_strength INTEGER, created_at TEXT, updated_at TEXT, "
            "deleted_at TEXT)"
        ),
        (
            "CREATE TABLE rooms ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "description TEXT, type TEXT, floor INTEGER, "
            "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
        ),
    ]

    def _make_db(self, tmp_dir):
        db_path = os.path.join(tmp_dir, "db.sqlite")
        conn = sqlite3.connect(db_path)
        for stmt in self.CREATE_TABLES:
            conn.execute(stmt)
        return conn

    def _make_scenario(self, **kwargs):
        with patch.object(AddDeviceToRoomScenario, "__init__", lambda self, *a, **kw: None):
            scenario = AddDeviceToRoomScenario.__new__(AddDeviceToRoomScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_execute(self, scenario, state_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "db.sqlite")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = state_dir

    def test_all_pass(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (10, 1, 'Living Room', 'living_room', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'My Bulb', 1, 10, 'online', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                device_name="My Bulb",
                device_type="Smart Bulb",
                room_name="Living Room",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["device_exists"])
            self.assertTrue(checks["correct_device_type"])
            self.assertTrue(checks["correct_room"])

    def test_device_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                device_name="Ghost Device",
                device_type="Smart Bulb",
                room_name="Living Room",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["device_exists"])
            self.assertFalse(checks["correct_device_type"])
            self.assertFalse(checks["correct_room"])

    def test_wrong_type(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (10, 1, 'Kitchen', 'kitchen', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Kitchen Plug', 3, 10, 'online', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                device_name="Kitchen Plug",
                device_type="Smart Bulb",
                room_name="Kitchen",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["device_exists"])
            self.assertFalse(checks["correct_device_type"])
            self.assertTrue(checks["correct_room"])

    def test_wrong_room(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (10, 1, 'Bedroom', 'bedroom', 2)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Fan Unit', 6, 10, 'online', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                device_name="Fan Unit",
                device_type="Smart Fan",
                room_name="Living Room",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["device_exists"])
            self.assertTrue(checks["correct_device_type"])
            self.assertFalse(checks["correct_room"])

    def test_deleted_device_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (10, 1, 'Office', 'office', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on, deleted_at) "
                "VALUES (1, 1, 'Old Switch', 2, 10, 'offline', 0, '2025-01-01')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                device_name="Old Switch",
                device_type="Smart Switch",
                room_name="Office",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["device_exists"])
            self.assertFalse(checks["correct_device_type"])
            self.assertFalse(checks["correct_room"])

    def test_case_insensitive_device_name(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (10, 1, 'Garage', 'garage', 0)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Garage Camera', 9, 10, 'online', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                device_name="garage camera",
                device_type="Security Camera",
                room_name="garage",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["device_exists"])
            self.assertTrue(checks["correct_device_type"])
            self.assertTrue(checks["correct_room"])


if __name__ == "__main__":
    unittest.main()
