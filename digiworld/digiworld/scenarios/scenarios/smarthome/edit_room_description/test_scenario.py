# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import EditRoomDescriptionScenario


class TestEditRoomDescriptionScenario(unittest.TestCase):
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
        with patch.object(EditRoomDescriptionScenario, "__init__", lambda self, *a, **kw: None):
            scenario = EditRoomDescriptionScenario.__new__(EditRoomDescriptionScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.room_name = kwargs.pop("room_name", "Kitchen")
        scenario.description = kwargs.pop("description", "Updated kitchen desc")
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

    def test_description_updated_correctly(self):
        scenario = self._make_scenario(
            room_name="Kitchen", description="Updated kitchen desc",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, description, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'Updated kitchen desc', 'kitchen', 1)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["description_updated"])

    def test_description_case_insensitive(self):
        scenario = self._make_scenario(
            room_name="Kitchen", description="UPDATED KITCHEN DESC",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, description, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'updated kitchen desc', 'kitchen', 1)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["description_updated"])

    def test_wrong_description(self):
        scenario = self._make_scenario(
            room_name="Kitchen", description="New description",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, description, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'Old description', 'kitchen', 1)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["description_updated"])

    def test_room_not_found_raises(self):
        scenario = self._make_scenario(room_name="Nonexistent")
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
