# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ConfigureSecurityCameraScenario


class TestConfigureSecurityCamera(unittest.TestCase):
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
        with patch.object(ConfigureSecurityCameraScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ConfigureSecurityCameraScenario.__new__(ConfigureSecurityCameraScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _default_props(self, **overrides):
        props = {
            "motion_detection": True,
            "night_vision": True,
            "two_way_audio": True,
            "recording": True,
            "cloud_storage": True,
        }
        props.update(overrides)
        return props

    def _default_params(self, **overrides):
        params = dict(
            device_name="Front Camera",
            motion_detection="enable",
            night_vision="enable",
            two_way_audio="enable",
            recording="enable",
            cloud_storage="enable",
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
                "VALUES (1, 1, 'Front Camera', 5, 1, ?)",
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
                "VALUES (1, 1, 'Front Camera', 5, 0, ?)",
                (json.dumps(self._default_props()),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["device_turned_on"])

    def test_wrong_motion_detection_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Front Camera', 5, 1, ?)",
                (json.dumps(self._default_props(motion_detection=False)),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["motion_detection_set"])
            self.assertTrue(checks["night_vision_set"])

    def test_device_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_all_features_disabled(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Front Camera', 5, 1, ?)",
                (json.dumps(self._default_props(
                    motion_detection=False,
                    night_vision=False,
                    two_way_audio=False,
                    recording=False,
                    cloud_storage=False,
                )),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(
                motion_detection="disable",
                night_vision="disable",
                two_way_audio="disable",
                recording="disable",
                cloud_storage="disable",
            ))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["device_turned_on"])
            self.assertTrue(checks["motion_detection_set"])
            self.assertTrue(checks["night_vision_set"])
            self.assertTrue(checks["two_way_audio_set"])
            self.assertTrue(checks["recording_set"])
            self.assertTrue(checks["cloud_storage_set"])

    def test_recording_mismatch_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Front Camera', 5, 1, ?)",
                (json.dumps(self._default_props(recording=False)),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["recording_set"])
            self.assertTrue(checks["cloud_storage_set"])

    def test_legacy_recording_enabled_still_passes(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Front Camera', 5, 1, ?)",
                (json.dumps(self._default_props(recording=True, recording_enabled=True)),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["recording_set"])

    def test_duplicate_names_prefer_latest_runtime_row(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Room Camera', 5, 1, ?)",
                (json.dumps({
                    "motion_detection": False,
                    "night_vision": False,
                    "recording_enabled": True,
                }),),
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (2, 1, 'Living Room Camera', 5, 1, ?)",
                (json.dumps({
                    "motion_detection": False,
                    "night_vision": False,
                    "two_way_audio": False,
                    "recording": False,
                    "cloud_storage": False,
                }),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(
                device_name="Living Room Camera",
                motion_detection="disable",
                night_vision="disable",
                two_way_audio="disable",
                recording="disable",
                cloud_storage="disable",
            ))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["recording_set"])
            self.assertTrue(checks["cloud_storage_set"])


if __name__ == "__main__":
    unittest.main()
