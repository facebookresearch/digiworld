# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ToggleAllCategoryScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ToggleAllCategoryScenario


class TestToggleAllCategoryScenario(unittest.TestCase):

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
        with patch.object(ToggleAllCategoryScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ToggleAllCategoryScenario.__new__(ToggleAllCategoryScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_execute(self, scenario, state_dir, initial_state_dir=None):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "db.sqlite")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = initial_state_dir if initial_state_dir else state_dir

    def test_all_devices_turned_on_pass(self):
        """Devices were OFF initially and all ON in final state -> both checks pass."""
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: some devices OFF
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Bulb A', 1, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Bulb B', 1, 2, 'online', 0)"
            )
            conn.commit()
            conn.close()

            # Final state: all devices ON
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Bulb A', 1, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Bulb B', 1, 2, 'online', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Turn on", item_type="devices")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)

            self.assertTrue(checks["not_already_toggled_initially"])
            self.assertTrue(checks["all_toggled"])

    def test_some_devices_still_off_fail(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: devices OFF
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Bulb A', 1, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Bulb B', 1, 2, 'online', 0)"
            )
            conn.commit()
            conn.close()

            # Final state: one device still OFF
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Bulb A', 1, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Bulb B', 1, 2, 'online', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Turn on", item_type="devices")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)

            self.assertTrue(checks["not_already_toggled_initially"])
            self.assertFalse(checks["all_toggled"])

    def test_already_toggled_initially_fails_precondition(self):
        """All items already in target state initially -> vacuous truth detected."""
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Bulb A', 1, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Bulb B', 1, 2, 'online', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Turn on", item_type="devices")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["not_already_toggled_initially"])
            self.assertTrue(checks["all_toggled"])

    def test_all_scenes_disabled_pass(self):
        """Scenes were active initially and all disabled in final state."""
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: scenes active
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (1, 1, 'Movie', 'movie', 1)"
            )
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (2, 1, 'Party', 'party', 1)"
            )
            conn.commit()
            conn.close()

            # Final state: scenes disabled
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (1, 1, 'Movie', 'movie', 0)"
            )
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, icon, is_active) "
                "VALUES (2, 1, 'Party', 'party', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Disable", item_type="scenes")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)

            self.assertTrue(checks["not_already_toggled_initially"])
            self.assertTrue(checks["all_toggled"])

    def test_unknown_action_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="restart", item_type="devices")
            self._setup_execute(scenario, d)

            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_unknown_item_type_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Turn off", item_type="widgets")
            self._setup_execute(scenario, d)

            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_all_automations_enabled_pass(self):
        """Automations were inactive initially and all enabled in final state."""
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: automations inactive
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (1, 1, 'Morning', 'time', 0)"
            )
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (2, 1, 'Night', 'time', 0)"
            )
            conn.commit()
            conn.close()

            # Final state: automations active
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (1, 1, 'Morning', 'time', 1)"
            )
            conn.execute(
                "INSERT INTO automations (id, user_id, name, trigger_type, is_active) "
                "VALUES (2, 1, 'Night', 'time', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Enable", item_type="automations")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)

            self.assertTrue(checks["not_already_toggled_initially"])
            self.assertTrue(checks["all_toggled"])

    def test_turn_off_devices_with_some_still_on_fail(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: devices ON
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Speaker', 8, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Camera', 9, 1, 'online', 1)"
            )
            conn.commit()
            conn.close()

            # Final state: one still ON
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Speaker', 8, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Camera', 9, 1, 'online', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Turn off", item_type="devices")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)

            self.assertTrue(checks["not_already_toggled_initially"])
            self.assertFalse(checks["all_toggled"])

    def test_deleted_items_ignored(self):
        """Soft-deleted devices should not count toward the wrong-state total."""
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: one active OFF device, one deleted OFF device
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Active Bulb', 1, 1, 'online', 0)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on, deleted_at) "
                "VALUES (2, 1, 'Deleted Bulb', 1, 1, 'offline', 0, '2025-01-01')"
            )
            conn.commit()
            conn.close()

            # Final state: active device ON, deleted device still OFF
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Active Bulb', 1, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on, deleted_at) "
                "VALUES (2, 1, 'Deleted Bulb', 1, 1, 'offline', 0, '2025-01-01')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(action="Turn on", item_type="devices")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)

            self.assertTrue(checks["not_already_toggled_initially"])
            self.assertTrue(checks["all_toggled"])


if __name__ == "__main__":
    unittest.main()
