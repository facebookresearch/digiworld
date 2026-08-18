# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.auction.test_helpers  # noqa: F401  # mock heavy deps
"""Tests for ToggleTransactionSuccessOnScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ToggleTransactionSuccessOnScenario


class TestToggleTransactionSuccessOnScenario(unittest.TestCase):
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
        with patch.object(ToggleTransactionSuccessOnScenario, '__init__', lambda self, *a, **kw: None):
            scenario = ToggleTransactionSuccessOnScenario.__new__(ToggleTransactionSuccessOnScenario)
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

    CONFIG_SQL = [
        "CREATE TABLE system_config (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "key TEXT NOT NULL UNIQUE, value TEXT, data_type TEXT, category TEXT, "
        "description TEXT, updated_at TEXT DEFAULT (datetime('now')))"
    ]
    SESSION_SQL = [
        "CREATE TABLE sessions (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "session_id TEXT NOT NULL UNIQUE, user_id INTEGER, seed INTEGER NOT NULL, "
        "transactions_succeed INTEGER DEFAULT 1, status TEXT DEFAULT 'active', "
        "created_at TEXT DEFAULT (datetime('now')), ended_at TEXT, metadata TEXT)"
    ]

    def test_pass_toggled_on(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, self.CONFIG_SQL + self.SESSION_SQL, [
                ("INSERT INTO system_config (key, value) VALUES (?, ?)",
                 ("transactions_succeed", "true")),
                ("INSERT INTO sessions (session_id, user_id, seed, transactions_succeed, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("sess-1", 1, 42, 1, "active")),
            ])
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, final_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_fail_config_false(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, self.CONFIG_SQL + self.SESSION_SQL, [
                ("INSERT INTO system_config (key, value) VALUES (?, ?)",
                 ("transactions_succeed", "false")),
                ("INSERT INTO sessions (session_id, user_id, seed, transactions_succeed, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("sess-1", 1, 42, 1, "active")),
            ])
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, final_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_fail_session_zero(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, self.CONFIG_SQL + self.SESSION_SQL, [
                ("INSERT INTO system_config (key, value) VALUES (?, ?)",
                 ("transactions_succeed", "true")),
                ("INSERT INTO sessions (session_id, user_id, seed, transactions_succeed, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("sess-1", 1, 42, 0, "active")),
            ])
            scenario = self._make_scenario()
            self._setup_state_manager(scenario, final_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
