# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import TurnOnDeviceScenario


class TestTurnOnDevice(unittest.TestCase):
    CREATE_DEVICES = (
        "CREATE TABLE devices ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
        "device_type_id INTEGER, room_id INTEGER, status TEXT, "
        "is_on INTEGER DEFAULT 0, properties TEXT, "
        "battery INTEGER, signal_strength INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    )

    def _make_db(self, tmp_dir):
        db_path = os.path.join(tmp_dir, "db.sqlite")
        conn = sqlite3.connect(db_path)
        conn.execute(self.CREATE_DEVICES)
        return conn

    def _make_scenario(self, **kwargs):
        with patch.object(TurnOnDeviceScenario, "__init__", lambda self, *a, **kw: None):
            scenario = TurnOnDeviceScenario.__new__(TurnOnDeviceScenario)
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

    def test_device_on_passes(self):
        """Device was OFF initially and is ON in final state -> both checks pass."""
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: device is OFF
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on) "
                "VALUES (1, 1, 'Living Room Bulb', 1, 0)",
            )
            conn.commit()
            conn.close()

            # Final state: device is ON
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on) "
                "VALUES (1, 1, 'Living Room Bulb', 1, 1)",
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(device_name="Living Room Bulb")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["device_was_off_initially"])
            self.assertTrue(checks["device_turned_on"])

    def test_device_off_fails(self):
        """Device was OFF initially and is still OFF -> device_turned_on fails."""
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on) "
                "VALUES (1, 1, 'Living Room Bulb', 1, 0)",
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(device_name="Living Room Bulb")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["device_was_off_initially"])
            self.assertFalse(checks["device_turned_on"])

    def test_device_already_on_initially_fails_precondition(self):
        """Device was already ON initially -> vacuous truth detected."""
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on) "
                "VALUES (1, 1, 'Living Room Bulb', 1, 1)",
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(device_name="Living Room Bulb")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["device_was_off_initially"])
            self.assertTrue(checks["device_turned_on"])

    def test_device_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(device_name="Nonexistent Device")
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            # Initial state: device is OFF
            conn = self._make_db(initial_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on) "
                "VALUES (1, 1, 'Bedroom Fan', 6, 0)",
            )
            conn.commit()
            conn.close()

            # Final state: device is ON
            conn = self._make_db(final_dir)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on) "
                "VALUES (1, 1, 'Bedroom Fan', 6, 1)",
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(device_name="bedroom fan")
            self._setup_execute(scenario, final_dir, initial_state_dir=initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["device_was_off_initially"])
            self.assertTrue(checks["device_turned_on"])

    def test_deleted_device_ignored(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, deleted_at) "
                "VALUES (1, 1, 'Living Room Bulb', 1, 1, '2025-01-01')",
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(device_name="Living Room Bulb")
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_wrong_user_ignored(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on) "
                "VALUES (1, 99, 'Living Room Bulb', 1, 1)",
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(device_name="Living Room Bulb", current_user_id=1)
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
