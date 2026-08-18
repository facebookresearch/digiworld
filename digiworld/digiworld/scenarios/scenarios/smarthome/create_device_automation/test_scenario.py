# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CreateDeviceAutomationScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import CreateDeviceAutomationScenario


class TestCreateDeviceAutomationScenario(unittest.TestCase):

    CREATE_TABLES = [
        (
            "CREATE TABLE automations ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "description TEXT, trigger_type TEXT, trigger_value TEXT, "
            "is_active INTEGER, created_at TEXT, updated_at TEXT, "
            "deleted_at TEXT)"
        ),
        (
            "CREATE TABLE automation_actions ("
            "id INTEGER PRIMARY KEY, automation_id INTEGER, "
            "action_type TEXT, device_id INTEGER, scene_id INTEGER, "
            "action_value TEXT, 'order' INTEGER)"
        ),
        (
            "CREATE TABLE devices ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "device_type_id INTEGER, room_id INTEGER, status TEXT, "
            "is_on INTEGER, properties TEXT, created_at TEXT, "
            "updated_at TEXT, deleted_at TEXT)"
        ),
    ]

    def _make_db(self, tmp_dir):
        db_path = os.path.join(tmp_dir, "db.sqlite")
        conn = sqlite3.connect(db_path)
        for stmt in self.CREATE_TABLES:
            conn.execute(stmt)
        return conn

    def _make_scenario(self, **kwargs):
        with patch.object(CreateDeviceAutomationScenario, "__init__", lambda self, *a, **kw: None):
            scenario = CreateDeviceAutomationScenario.__new__(CreateDeviceAutomationScenario)
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
                "INSERT INTO automations (id, user_id, name, description, trigger_type, is_active) "
                "VALUES (1, 1, 'Morning Lights', 'Turn on lights every morning', 'time', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (5, 1, 'Living Room Bulb', 1, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO automation_actions (id, automation_id, action_type, device_id, action_value, 'order') "
                "VALUES (1, 1, 'turn_on', 5, NULL, 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                automation_name="Morning Lights",
                automation_description="Turn on lights every morning",
                trigger_type="time",
                device_name="Living Room Bulb",
                device_type="Smart Bulb",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["automation_exists"])
            self.assertTrue(checks["description_matches"])
            self.assertTrue(checks["trigger_type_matches"])
            self.assertTrue(checks["device_linked"])

    def test_automation_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                automation_name="Nonexistent",
                automation_description="Does not exist",
                trigger_type="geofence",
                device_name="Some Device",
                device_type="Smart Plug",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["automation_exists"])
            self.assertFalse(checks["description_matches"])
            self.assertFalse(checks["trigger_type_matches"])
            self.assertFalse(checks["device_linked"])

    def test_wrong_trigger(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO automations (id, user_id, name, description, trigger_type, is_active) "
                "VALUES (1, 1, 'Motion Alert', 'Alert on motion', 'motion', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (3, 1, 'Front Camera', 9, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO automation_actions (id, automation_id, action_type, device_id, action_value, 'order') "
                "VALUES (1, 1, 'record', 3, NULL, 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                automation_name="Motion Alert",
                automation_description="Alert on motion",
                trigger_type="geofence",
                device_name="Front Camera",
                device_type="Security Camera",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["automation_exists"])
            self.assertTrue(checks["description_matches"])
            self.assertFalse(checks["trigger_type_matches"])
            self.assertTrue(checks["device_linked"])

    def test_device_not_linked(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO automations (id, user_id, name, description, trigger_type, is_active) "
                "VALUES (1, 1, 'Night Mode', 'Activate night mode', 'time', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (7, 1, 'Bedroom Heater', 7, 2, 'online', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                automation_name="Night Mode",
                automation_description="Activate night mode",
                trigger_type="time",
                device_name="Bedroom Heater",
                device_type="Smart Heater",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["automation_exists"])
            self.assertTrue(checks["description_matches"])
            self.assertTrue(checks["trigger_type_matches"])
            self.assertFalse(checks["device_linked"])

    def test_deleted_automation_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO automations (id, user_id, name, description, trigger_type, is_active, deleted_at) "
                "VALUES (1, 1, 'Deleted Rule', 'Was removed', 'geofence', 0, '2025-06-01')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                automation_name="Deleted Rule",
                automation_description="Was removed",
                trigger_type="geofence",
                device_name="Any Device",
                device_type="Smart Plug",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["automation_exists"])

    def test_case_insensitive_name(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO automations (id, user_id, name, description, trigger_type, is_active) "
                "VALUES (1, 1, 'Evening Routine', 'Dims lights in the evening', 'time', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Office Bulb', 1, 3, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO automation_actions (id, automation_id, action_type, device_id, action_value, 'order') "
                "VALUES (1, 1, 'dim', 2, NULL, 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                automation_name="evening routine",
                automation_description="Dims lights in the evening",
                trigger_type="time",
                device_name="office bulb",
                device_type="Smart Bulb",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["automation_exists"])
            self.assertTrue(checks["device_linked"])


if __name__ == "__main__":
    unittest.main()
