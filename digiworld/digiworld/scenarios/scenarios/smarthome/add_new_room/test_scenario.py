# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddNewRoomScenario


class TestAddNewRoomScenario(unittest.TestCase):
    CREATE_TABLE = (
        "CREATE TABLE rooms ("
        "  id INTEGER PRIMARY KEY,"
        "  user_id INTEGER,"
        "  name TEXT,"
        "  description TEXT,"
        "  type TEXT,"
        "  floor INTEGER,"
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
        with patch.object(AddNewRoomScenario, "__init__", lambda self, *a, **kw: None):
            scenario = AddNewRoomScenario.__new__(AddNewRoomScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.room_name = kwargs.pop("room_name", "Kitchen")
        scenario.description = kwargs.pop("description", "Main kitchen")
        scenario.room_type = kwargs.pop("room_type", "kitchen")
        scenario.floor = kwargs.pop("floor", 1)
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

    def test_room_created_with_correct_attributes(self):
        scenario = self._make_scenario(
            room_name="Kitchen", description="Main kitchen",
            room_type="kitchen", floor=1,
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, description, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'Main kitchen', 'kitchen', 1)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["room_created"])
        self.assertTrue(checks["correct_description"])
        self.assertTrue(checks["correct_type"])
        self.assertTrue(checks["correct_floor"])

    def test_room_not_found(self):
        scenario = self._make_scenario(room_name="Garage")
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["room_created"])
        self.assertFalse(checks["correct_description"])
        self.assertFalse(checks["correct_type"])
        self.assertFalse(checks["correct_floor"])

    def test_wrong_type(self):
        scenario = self._make_scenario(
            room_name="Kitchen", description="Main kitchen",
            room_type="bedroom", floor=1,
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, description, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'Main kitchen', 'kitchen', 1)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["room_created"])
        self.assertFalse(checks["correct_type"])

    def test_wrong_floor(self):
        scenario = self._make_scenario(
            room_name="Kitchen", description="Main kitchen",
            room_type="kitchen", floor=2,
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, description, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'Main kitchen', 'kitchen', 1)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["room_created"])
        self.assertFalse(checks["correct_floor"])

    def test_deleted_room_not_found(self):
        scenario = self._make_scenario(room_name="Kitchen")
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, description, type, floor, deleted_at) "
                "VALUES (1, 1, 'Kitchen', 'Main kitchen', 'kitchen', 1, '2026-01-01')"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["room_created"])


if __name__ == "__main__":
    unittest.main()
