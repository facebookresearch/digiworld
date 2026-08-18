# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import DeviceInfoQueryScenario


class TestDeviceInfoQueryScenario(unittest.TestCase):
    CREATE_TABLE = (
        "CREATE TABLE devices ("
        "  id INTEGER PRIMARY KEY,"
        "  user_id INTEGER,"
        "  name TEXT,"
        "  device_type_id INTEGER,"
        "  room_id INTEGER,"
        "  status TEXT,"
        "  is_on INTEGER,"
        "  properties TEXT,"
        "  battery INTEGER,"
        "  signal_strength INTEGER,"
        "  created_at TEXT,"
        "  updated_at TEXT,"
        "  deleted_at TEXT"
        ")"
    )

    def _make_db(self, tmp_dir, db_name="db.sqlite"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(self.CREATE_TABLE)
        return conn, db_path

    def _make_scenario(self, **kwargs):
        with patch.object(DeviceInfoQueryScenario, "__init__", lambda self, *a, **kw: None):
            scenario = DeviceInfoQueryScenario.__new__(DeviceInfoQueryScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.info_type = kwargs.pop("info_type", "battery percentage")
        scenario.device_name = kwargs.pop("device_name", "Smart Light")
        scenario.agent_answer = kwargs.pop("agent_answer", "85")
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

    def test_correct_battery(self):
        scenario = self._make_scenario(
            info_type="battery percentage",
            device_name="Smart Light",
            agent_answer="The battery is at 85%",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO devices "
                "(id, user_id, name, device_type_id, room_id, status, is_on, battery, signal_strength) "
                "VALUES (1, 1, 'Smart Light', 1, 1, 'active', 1, 85, 70)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["answer_correct"])

    def test_correct_signal_strength(self):
        scenario = self._make_scenario(
            info_type="connection percentage",
            device_name="Smart Light",
            agent_answer="Signal strength is 70%",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO devices "
                "(id, user_id, name, device_type_id, room_id, status, is_on, battery, signal_strength) "
                "VALUES (1, 1, 'Smart Light', 1, 1, 'active', 1, 85, 70)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["answer_correct"])

    def test_wrong_answer(self):
        scenario = self._make_scenario(
            info_type="battery percentage",
            device_name="Smart Light",
            agent_answer="The battery is at 50%",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO devices "
                "(id, user_id, name, device_type_id, room_id, status, is_on, battery, signal_strength) "
                "VALUES (1, 1, 'Smart Light', 1, 1, 'active', 1, 85, 70)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["answer_correct"])

    def test_device_not_found_raises(self):
        scenario = self._make_scenario(
            info_type="battery percentage",
            device_name="Nonexistent Device",
            agent_answer="85",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_unknown_info_type_raises(self):
        scenario = self._make_scenario(
            info_type="unknown metric",
            device_name="Smart Light",
            agent_answer="42",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO devices "
                "(id, user_id, name, device_type_id, room_id, status, is_on, battery, signal_strength) "
                "VALUES (1, 1, 'Smart Light', 1, 1, 'active', 1, 85, 70)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
