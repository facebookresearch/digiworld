# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for LastTransactionDateScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import LastTransactionDateScenario


class TestLastTransactionDateScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(
            "CREATE TABLE transactions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
            "transaction_date TEXT, status TEXT, amount REAL, description TEXT)"
        )
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(LastTransactionDateScenario, '__init__', lambda self, *a, **kw: None):
            scenario = LastTransactionDateScenario.__new__(LastTransactionDateScenario)
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
        "INSERT INTO transactions (user_id, transaction_date, status, amount, description) "
        "VALUES (?, ?, ?, ?, ?)"
    )

    def test_correct_date_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "2026-02-20T10:30:00", "success", 100.0, "Deposit")),
                (self.INSERT_SQL, (1, "2026-02-15T08:00:00", "success", 50.0, "Payment")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was on February 20, 2026"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_date_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "2026-02-20T10:30:00", "success", 100.0, "Deposit")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was on January 1, 2026"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_no_transactions_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(agent_answer="No transactions found")
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_ignores_failed_transactions(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "2026-02-20T10:30:00", "failed", 100.0, "Failed TX")),
                (self.INSERT_SQL, (1, "2026-02-10T08:00:00", "success", 50.0, "Payment")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was on February 10, 2026"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_tiebreaker_uses_highest_id(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "2026-02-20T10:30:00", "success", 100.0, "First")),
                (self.INSERT_SQL, (1, "2026-02-20T10:30:00", "success", 200.0, "Second")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was on February 20, 2026"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
