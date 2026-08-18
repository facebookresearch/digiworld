# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ConfigureSmartAcScenario


class TestConfigureSmartAc(unittest.TestCase):
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
        with patch.object(ConfigureSmartAcScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ConfigureSmartAcScenario.__new__(ConfigureSmartAcScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _default_props(self, **overrides):
        props = {
            "temperature": 22,
            "target_temperature": 22,
            "fan_speed": 3,
            "mode": "cool",
            "scheduling": True,
        }
        props.update(overrides)
        return props

    def _default_params(self, **overrides):
        params = dict(
            device_name="Living Room AC",
            temperature="22",
            fan_speed="3",
            mode="cool",
            scheduling="enable",
        )
        params.update(overrides)
        return params

    def _setup_execute(self, scenario, state_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "db.sqlite")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = state_dir

    def test_all_checks_pass(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Room AC', 6, 1, ?)",
                (json.dumps(self._default_props()),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(all(checks.values()))

    def test_device_off_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Room AC', 6, 0, ?)",
                (json.dumps(self._default_props()),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["device_turned_on"])

    def test_wrong_temperature_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Room AC', 6, 1, ?)",
                (json.dumps(self._default_props(temperature=18)),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["temperature_set"])
            self.assertTrue(checks["fan_speed_set"])

    def test_device_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_wrong_mode_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Room AC', 6, 1, ?)",
                (json.dumps(self._default_props(mode="heat")),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["mode_set"])

    def test_mode_compared_lowercase(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Room AC', 6, 1, ?)",
                (json.dumps(self._default_props(mode="cool")),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(mode="Cool"))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["mode_set"])


if __name__ == "__main__":
    unittest.main()
