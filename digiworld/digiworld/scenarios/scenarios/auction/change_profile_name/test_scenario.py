# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.auction.test_helpers  # noqa: F401  # mock heavy deps
"""Tests for ChangeProfileNameScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ChangeProfileNameScenario


class TestChangeProfileNameScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, table_sql, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in table_sql:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(ChangeProfileNameScenario, '__init__', lambda self, *a, **kw: None):
            scenario = ChangeProfileNameScenario.__new__(ChangeProfileNameScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, initial_dir, final_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = initial_dir

    USERS_SQL = [
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "username TEXT NOT NULL UNIQUE, email TEXT, name TEXT, password TEXT, "
        "seller_rating REAL DEFAULT 0, total_sales INTEGER DEFAULT 0, "
        "total_items_listed INTEGER DEFAULT 0, "
        "created_at TEXT DEFAULT (datetime('now')), "
        "updated_at TEXT DEFAULT (datetime('now')))"
    ]

    def test_pass_name_changed(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, self.USERS_SQL, [
                ("INSERT INTO users (id, username, name) VALUES (?, ?, ?)",
                 (1, "user1", "New Display Name")),
            ])
            scenario = self._make_scenario(name="New Display Name")
            self._setup_state_manager(scenario, final_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_pass_case_insensitive(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, self.USERS_SQL, [
                ("INSERT INTO users (id, username, name) VALUES (?, ?, ?)",
                 (1, "user1", "john doe")),
            ])
            scenario = self._make_scenario(name="John Doe")
            self._setup_state_manager(scenario, final_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_fail_name_unchanged(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, self.USERS_SQL, [
                ("INSERT INTO users (id, username, name) VALUES (?, ?, ?)",
                 (1, "user1", "Old Name")),
            ])
            scenario = self._make_scenario(name="New Name")
            self._setup_state_manager(scenario, final_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
