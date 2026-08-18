# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ChangeNameScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ChangeNameScenario

USERS_DDL = (
    "CREATE TABLE users ("
    "id INTEGER PRIMARY KEY, email TEXT, password TEXT, full_name TEXT, "
    "phone_number TEXT, created_at TEXT, updated_at TEXT, status TEXT, "
    "settings TEXT, metadata TEXT)"
)

INSERT_USER = (
    "INSERT INTO users (id, email, password, full_name) VALUES (?, ?, ?, ?)"
)


class TestChangeNameScenario(unittest.TestCase):

    def _make_db(self, tmp_dir, records):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(USERS_DDL)
        for rec in records:
            conn.execute(INSERT_USER, rec)
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(ChangeNameScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ChangeNameScenario.__new__(ChangeNameScenario)
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
        scenario._state_manager = MagicMock()
        scenario.agent_answer = ""
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, state_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path

    def test_name_changed_passes(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [(1, "u@test.com", "pw", "New Name")])
            scenario = self._make_scenario(name="New Name")
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["name_updated"])

    def test_name_not_changed_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [(1, "u@test.com", "pw", "Old Name")])
            scenario = self._make_scenario(name="New Name")
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["name_updated"])

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [(1, "u@test.com", "pw", "Alice Johnson")])
            scenario = self._make_scenario(name="alice johnson")
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["name_updated"])

    def test_missing_user_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(name="Any Name")
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
