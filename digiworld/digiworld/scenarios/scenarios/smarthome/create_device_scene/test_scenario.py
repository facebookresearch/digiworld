# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CreateDeviceSceneScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import CreateDeviceSceneScenario


class TestCreateDeviceSceneScenario(unittest.TestCase):

    CREATE_TABLES = [
        (
            "CREATE TABLE scenes ("
            "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, "
            "description TEXT, icon TEXT, is_active INTEGER, "
            "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
        ),
        (
            "CREATE TABLE scene_devices ("
            "id INTEGER PRIMARY KEY, scene_id INTEGER, device_id INTEGER, "
            "target_state TEXT, 'order' INTEGER)"
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
        with patch.object(CreateDeviceSceneScenario, "__init__", lambda self, *a, **kw: None):
            scenario = CreateDeviceSceneScenario.__new__(CreateDeviceSceneScenario)
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
                "INSERT INTO scenes (id, user_id, name, description, icon, is_active) "
                "VALUES (1, 1, 'Movie Night', 'Dim lights and set mood', 'tv', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (5, 1, 'Living Room Bulb', 1, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO scene_devices (id, scene_id, device_id, target_state, 'order') "
                "VALUES (1, 1, 5, '{\"brightness\": 20}', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                scene_name="Movie Night",
                scene_description="Dim lights and set mood",
                icon="tv",
                device_name="Living Room Bulb",
                device_type="Smart Bulb",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["scene_exists"])
            self.assertTrue(checks["description_matches"])
            self.assertTrue(checks["icon_matches"])
            self.assertTrue(checks["device_linked"])

    def test_scene_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                scene_name="Ghost Scene",
                scene_description="Does not exist",
                icon="musical-notes",
                device_name="Any Device",
                device_type="Smart Plug",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["scene_exists"])
            self.assertFalse(checks["description_matches"])
            self.assertFalse(checks["icon_matches"])
            self.assertFalse(checks["device_linked"])

    def test_wrong_icon(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, description, icon, is_active) "
                "VALUES (1, 1, 'Party Mode', 'All lights on full', 'home', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (3, 1, 'LED Strip', 4, 1, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO scene_devices (id, scene_id, device_id, target_state, 'order') "
                "VALUES (1, 1, 3, '{\"brightness\": 100}', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                scene_name="Party Mode",
                scene_description="All lights on full",
                icon="musical-notes",
                device_name="LED Strip",
                device_type="LED Strips",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["scene_exists"])
            self.assertTrue(checks["description_matches"])
            self.assertFalse(checks["icon_matches"])
            self.assertTrue(checks["device_linked"])

    def test_device_not_linked(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, description, icon, is_active) "
                "VALUES (1, 1, 'Work Focus', 'Office setup', 'home', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (8, 1, 'Office Speaker', 8, 3, 'online', 0)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                scene_name="Work Focus",
                scene_description="Office setup",
                icon="home",
                device_name="Office Speaker",
                device_type="Smart Speaker",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["scene_exists"])
            self.assertTrue(checks["description_matches"])
            self.assertTrue(checks["icon_matches"])
            self.assertFalse(checks["device_linked"])

    def test_deleted_scene_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, description, icon, is_active, deleted_at) "
                "VALUES (1, 1, 'Old Scene', 'Removed', 'home', 0, '2025-03-01')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                scene_name="Old Scene",
                scene_description="Removed",
                icon="home",
                device_name="Any Device",
                device_type="Smart Plug",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["scene_exists"])

    def test_case_insensitive_scene_and_device(self):
        with tempfile.TemporaryDirectory() as d:
            conn = self._make_db(d)
            conn.execute(
                "INSERT INTO scenes (id, user_id, name, description, icon, is_active) "
                "VALUES (1, 1, 'Bedtime Routine', 'Prepare for sleep', 'bed', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Bedroom Bulb', 1, 2, 'online', 1)"
            )
            conn.execute(
                "INSERT INTO scene_devices (id, scene_id, device_id, target_state, 'order') "
                "VALUES (1, 1, 2, '{\"brightness\": 5}', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                scene_name="bedtime routine",
                scene_description="Prepare for sleep",
                icon="bed",
                device_name="bedroom bulb",
                device_type="Smart Bulb",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["scene_exists"])
            self.assertTrue(checks["device_linked"])


if __name__ == "__main__":
    unittest.main()
