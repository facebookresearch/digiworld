# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ChangePasswordScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ChangePasswordScenario

USERS_DDL = (
    "CREATE TABLE users ("
    "id INTEGER PRIMARY KEY, email TEXT, password TEXT, full_name TEXT, "
    "phone_number TEXT, created_at TEXT, updated_at TEXT, status TEXT, "
    "settings TEXT, metadata TEXT)"
)

INSERT_USER = (
    "INSERT INTO users (id, email, password, full_name) VALUES (?, ?, ?, ?)"
)


class TestChangePasswordScenario(unittest.TestCase):

    def _make_db(self, tmp_dir, records):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(USERS_DDL)
        for rec in records:
            conn.execute(INSERT_USER, rec)
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(ChangePasswordScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ChangePasswordScenario.__new__(ChangePasswordScenario)
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

    def test_password_changed_passes(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [(1, "u@test.com", "N3wS3cure!", "User")])
            scenario = self._make_scenario(new_password="N3wS3cure!")
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["password_updated"])

    def test_password_not_changed_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [(1, "u@test.com", "OldPass123", "User")])
            scenario = self._make_scenario(new_password="N3wS3cure!")
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["password_updated"])

    def test_exact_match_required(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [(1, "u@test.com", "abc123!", "User")])
            scenario = self._make_scenario(new_password="abc123")
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["password_updated"])

    def test_missing_user_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(new_password="Whatever1!")
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
