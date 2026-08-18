# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CheckWalletBalanceScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import CheckWalletBalanceScenario


class TestCheckWalletBalanceScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(
            "CREATE TABLE wallets ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
            "balance REAL, currency TEXT, type TEXT, status TEXT, "
            "created_at TEXT, updated_at TEXT)"
        )
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(CheckWalletBalanceScenario, '__init__', lambda self, *a, **kw: None):
            scenario = CheckWalletBalanceScenario.__new__(CheckWalletBalanceScenario)
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
        "INSERT INTO wallets (user_id, balance, currency, type, status, "
        "created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )

    def test_correct_balance_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 1500.75, "USD", "personal", "active",
                                   "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your current wallet balance is $1,500.75"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_balance_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 1500.75, "USD", "personal", "active",
                                   "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your current wallet balance is $999.99"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_no_wallet_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(agent_answer="No wallet found")
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_inactive_wallet_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 500.00, "USD", "personal", "frozen",
                                   "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your balance is $500.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
