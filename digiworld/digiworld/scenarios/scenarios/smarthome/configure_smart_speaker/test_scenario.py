# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ConfigureSmartSpeakerScenario


class TestConfigureSmartSpeaker(unittest.TestCase):
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
        with patch.object(ConfigureSmartSpeakerScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ConfigureSmartSpeakerScenario.__new__(ConfigureSmartSpeakerScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _default_props(self, **overrides):
        props = {
            "volume": 50,
            "audio_mode": "music",
            "is_playing": True,
        }
        props.update(overrides)
        return props

    def _default_params(self, **overrides):
        params = dict(
            device_name="Living Speaker",
            volume="50",
            speaker_type="music",
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
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
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
                "VALUES (1, 1, 'Living Speaker', 11, 0, ?)",
                (json.dumps(self._default_props()),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["device_turned_on"])

    def test_wrong_volume_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
                (json.dumps(self._default_props(volume=30)),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["volume_set"])

    def test_device_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_unknown_speaker_type_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
                (json.dumps(self._default_props()),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(speaker_type="unknown"))
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_voice_speaker_type(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
                (json.dumps({"volume": 50, "audio_mode": "voice", "is_playing": True}),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(speaker_type="voice"))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["speaker_type_set"])

    def test_bt_speaker_type(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
                (json.dumps({"volume": 50, "audio_mode": "bluetooth", "is_playing": True}),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(speaker_type="bluetooth"))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["speaker_type_set"])

    def test_legacy_boolean_speaker_type_still_passes(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
                (json.dumps({"volume": 50, "voice_assistant": True, "is_playing": True}),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(speaker_type="voice"))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["speaker_type_set"])

    def test_not_playing_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
                (json.dumps(self._default_props(is_playing=False)),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params())
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["is_playing"])

    def test_duplicate_names_prefer_audio_mode_row(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Kitchen Speaker', 11, 1, ?)",
                (json.dumps({"volume": 50, "music_playback": True, "is_playing": True}),),
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (2, 1, 'Kitchen Speaker', 11, 1, ?)",
                (json.dumps({"volume": 50, "audio_mode": "bluetooth", "is_playing": True}),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(
                device_name="Kitchen Speaker",
                speaker_type="bluetooth",
            ))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["speaker_type_set"])

    def test_missing_audio_mode_defaults_to_music(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, is_on, properties) "
                "VALUES (1, 1, 'Living Speaker', 11, 1, ?)",
                (json.dumps({"volume": 50, "is_playing": True}),),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(**self._default_params(speaker_type="music"))
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["speaker_type_set"])


if __name__ == "__main__":
    unittest.main()
