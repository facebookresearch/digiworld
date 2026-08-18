# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CheckLimitScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import CheckLimitScenario


class TestCheckLimitScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(
            "CREATE TABLE users ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, password TEXT, "
            "pin TEXT, pin_attempts INTEGER, pin_locked_until TEXT, "
            "first_name TEXT, last_name TEXT, phone_number TEXT, "
            "created_at TEXT, updated_at TEXT, settings TEXT, status TEXT, "
            "kyc_verified INTEGER, daily_limit REAL, monthly_limit REAL)"
        )
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(CheckLimitScenario, '__init__', lambda self, *a, **kw: None):
            scenario = CheckLimitScenario.__new__(CheckLimitScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
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
        scenario.initial_state_path = state_dir

    INSERT_SQL = (
        "INSERT INTO users (id, email, first_name, last_name, status, "
        "daily_limit, monthly_limit) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )

    def test_daily_limit_correct(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "me@x.com", "Me", "User", "active", 500.0, 10000.0)),
            ])
            scenario = self._make_scenario(
                limit_type="daily",
                agent_answer="Your daily limit is $500.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_daily_limit_wrong(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "me@x.com", "Me", "User", "active", 500.0, 10000.0)),
            ])
            scenario = self._make_scenario(
                limit_type="daily",
                agent_answer="Your daily limit is $1000.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_monthly_limit_correct(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "me@x.com", "Me", "User", "active", 500.0, 10000.0)),
            ])
            scenario = self._make_scenario(
                limit_type="monthly",
                agent_answer="Your monthly limit is $10,000.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_monthly_limit_wrong(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "me@x.com", "Me", "User", "active", 500.0, 10000.0)),
            ])
            scenario = self._make_scenario(
                limit_type="monthly",
                agent_answer="Your monthly limit is $5,000.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_unknown_limit_type_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "me@x.com", "Me", "User", "active", 500.0, 10000.0)),
            ])
            scenario = self._make_scenario(
                limit_type="weekly",
                agent_answer="Your weekly limit is $500.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_user_not_found_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(
                limit_type="daily",
                agent_answer="Your daily limit is $500.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
