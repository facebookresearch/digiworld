# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for TurnOffAllInRoomScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import TurnOffAllInRoomScenario


class TestTurnOffAllInRoomScenario(unittest.TestCase):

    CREATE_TABLES = [
        (
            "CREATE TABLE rooms ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "description TEXT, type TEXT, floor INTEGER, "
            "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
        ),
        (
            "CREATE TABLE devices ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "device_type_id INTEGER, room_id INTEGER, status TEXT, "
            "is_on INTEGER, properties TEXT, battery INTEGER, "
            "signal_strength INTEGER, created_at TEXT, updated_at TEXT, "
            "deleted_at TEXT)"
        ),
        (
            "CREATE TABLE scenes ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "description TEXT, icon TEXT, is_active INTEGER, "
            "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
        ),
        (
            "CREATE TABLE automations ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "description TEXT, trigger_type TEXT, trigger_value TEXT, "
            "is_active INTEGER, created_at TEXT, updated_at TEXT, "
            "deleted_at TEXT)"
        ),
    ]

    def _make_db(self, tmp_dir):
        db_path = os.path.join(tmp_dir, "db.sqlite")
        conn = sqlite3.connect(db_path)
        for stmt in self.CREATE_TABLES:
            conn.execute(stmt)
        return conn

    def _make_scenario(self, **kwargs):
        with patch.object(TurnOffAllInRoomScenario, "__init__", lambda self, *a, **kw: None):
            scenario = TurnOffAllInRoomScenario.__new__(TurnOffAllInRoomScenario)
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

    def test_all_off_pass(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Living Room', 'living_room', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Lamp', 1, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Fan', 6, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (1, 1, 'Auto Off', 'time', 0)"
            )
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (1, 1, 'Night', 'bedtime', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(room_name="Living Room")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["all_devices_off"])
            self.assertTrue(checks["all_automations_off"])
            self.assertTrue(checks["all_scenes_off"])

    def test_device_still_on_fail(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Bedroom', 'bedroom', 2)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Heater', 7, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (1, 1, 'Rule', 'manual', 0)"
            )
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (1, 1, 'Sleep', 'bedtime', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(room_name="Bedroom")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["all_devices_off"])
            self.assertTrue(checks["all_automations_off"])
            self.assertTrue(checks["all_scenes_off"])

    def test_automation_still_active_fail(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'kitchen', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Plug', 3, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (1, 1, 'Timer', 'time', 1)"
            )
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (1, 1, 'Cook', 'dinner', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(room_name="Kitchen")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["all_devices_off"])
            self.assertFalse(checks["all_automations_off"])
            self.assertTrue(checks["all_scenes_off"])

    def test_scene_still_active_fail(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Office', 'office', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Desk Lamp', 1, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (1, 1, 'Auto', 'time', 0)"
            )
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (1, 1, 'Focus', 'work', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(room_name="Office")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["all_devices_off"])
            self.assertTrue(checks["all_automations_off"])
            self.assertFalse(checks["all_scenes_off"])

    def test_missing_room_name_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario()
            self._setup_execute(scenario, d)

            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_empty_room_all_pass(self):
        """Room exists but has no devices; automations and scenes inactive."""
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Empty Room', 'other', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(room_name="Empty Room")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["all_devices_off"])
            self.assertTrue(checks["all_automations_off"])
            self.assertTrue(checks["all_scenes_off"])


if __name__ == "__main__":
    unittest.main()
