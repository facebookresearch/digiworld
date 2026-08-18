# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import RoomInfoQueryScenario


class TestRoomInfoQueryScenario(unittest.TestCase):
    CREATE_ROOMS = (
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
    CREATE_DEVICES = (
        "CREATE TABLE devices ("
        "  id INTEGER PRIMARY KEY,"
        "  user_id INTEGER,"
        "  name TEXT,"
        "  device_type_id INTEGER,"
        "  room_id INTEGER REFERENCES rooms(id),"
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
        conn.execute(self.CREATE_ROOMS)
        conn.execute(self.CREATE_DEVICES)
        return conn, db_path

    def _make_scenario(self, **kwargs):
        with patch.object(RoomInfoQueryScenario, "__init__", lambda self, *a, **kw: None):
            scenario = RoomInfoQueryScenario.__new__(RoomInfoQueryScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.question = kwargs.pop("question", "How many devices are in the room?")
        scenario.room_name = kwargs.pop("room_name", "Kitchen")
        scenario.agent_answer = kwargs.pop("agent_answer", "3")
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

    def test_correct_device_count(self):
        scenario = self._make_scenario(
            question="How many devices are in the Kitchen?",
            room_name="Kitchen",
            agent_answer="There are 2 devices",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'kitchen', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Light', 1, 1, 'active', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (2, 1, 'Fan', 2, 1, 'active', 0)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["answer_correct"])

    def test_wrong_device_count(self):
        scenario = self._make_scenario(
            question="How many devices are in the Kitchen?",
            room_name="Kitchen",
            agent_answer="There are 5 devices",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'kitchen', 1)"
            )
            conn.execute(
                "INSERT INTO devices (id, user_id, name, device_type_id, room_id, status, is_on) "
                "VALUES (1, 1, 'Light', 1, 1, 'active', 1)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["answer_correct"])

    def test_correct_floor(self):
        scenario = self._make_scenario(
            question="What floor is the Kitchen on?",
            room_name="Kitchen",
            agent_answer="The Kitchen is on floor 2",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'kitchen', 2)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["answer_correct"])

    def test_wrong_floor(self):
        scenario = self._make_scenario(
            question="What floor is the Kitchen on?",
            room_name="Kitchen",
            agent_answer="The Kitchen is on floor 3",
        )
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.execute(
                "INSERT INTO rooms (id, user_id, name, type, floor) "
                "VALUES (1, 1, 'Kitchen', 'kitchen', 2)"
            )
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["answer_correct"])

    def test_missing_question_raises(self):
        scenario = self._make_scenario(room_name="Kitchen", agent_answer="3")
        scenario.question = None
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn, _ = self._make_db(tmp_dir)
            conn.commit()
            conn.close()
            self._setup_execute(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
