# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ExtremeTransactionQueryScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ExtremeTransactionQueryScenario


class TestExtremeTransactionQueryScenario(unittest.TestCase):
    TABLES_SQL = [
        "CREATE TABLE transaction_types ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT)",
        "CREATE TABLE transactions ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
        "transaction_type_id INTEGER, transaction_date TEXT, status TEXT, "
        "amount REAL, description TEXT)",
    ]

    SEED_TX_TYPES = [
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (1, "deposit", "Deposit", "credit")),
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (2, "withdrawal", "Withdrawal", "debit")),
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (3, "transfer", "Transfer", "transfer")),
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (4, "bill_payment", "Bill Payment", "debit")),
    ]

    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in self.TABLES_SQL:
            conn.execute(sql)
        for insert_sql, params in self.SEED_TX_TYPES:
            conn.execute(insert_sql, params)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(ExtremeTransactionQueryScenario, '__init__', lambda self, *a, **kw: None):
            scenario = ExtremeTransactionQueryScenario.__new__(ExtremeTransactionQueryScenario)
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
        "INSERT INTO transactions (user_id, transaction_type_id, transaction_date, "
        "status, amount, description) VALUES (?, ?, ?, ?, ?, ?)"
    )

    def test_most_expensive_incoming(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 1, "2026-01-10", "success", 500.0, "Salary Deposit")),
                (self.INSERT_SQL, (1, 1, "2026-01-15", "success", 2000.0, "Bonus Deposit")),
                (self.INSERT_SQL, (1, 1, "2026-01-20", "success", 100.0, "Refund")),
            ])
            scenario = self._make_scenario(
                extreme_type="most expensive",
                direction="incoming",
                agent_answer="Your largest incoming transaction was Bonus Deposit for $2,000.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["amount_matches"])
            self.assertTrue(checks["description_matches"])

    def test_least_expensive_outgoing(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 2, "2026-01-10", "success", 25.50, "Coffee Shop")),
                (self.INSERT_SQL, (1, 2, "2026-01-15", "success", 150.0, "Electric Bill")),
                (self.INSERT_SQL, (1, 4, "2026-01-20", "success", 500.0, "Rent Payment")),
            ])
            scenario = self._make_scenario(
                extreme_type="least expensive",
                direction="outgoing",
                agent_answer="Your smallest outgoing transaction was Coffee Shop for $25.50"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["amount_matches"])
            self.assertTrue(checks["description_matches"])

    def test_oldest_incoming(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 1, "2025-06-01", "success", 1000.0, "First Deposit")),
                (self.INSERT_SQL, (1, 1, "2026-01-15", "success", 2000.0, "Recent Deposit")),
            ])
            scenario = self._make_scenario(
                extreme_type="oldest",
                direction="incoming",
                agent_answer="Your oldest incoming transaction was First Deposit for $1,000.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["amount_matches"])
            self.assertTrue(checks["description_matches"])

    def test_newest_outgoing(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 2, "2025-06-01", "success", 100.0, "Old Withdrawal")),
                (self.INSERT_SQL, (1, 2, "2026-02-20", "success", 75.0, "Latest Purchase")),
            ])
            scenario = self._make_scenario(
                extreme_type="newest",
                direction="outgoing",
                agent_answer="Your newest outgoing transaction was Latest Purchase for $75.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["amount_matches"])
            self.assertTrue(checks["description_matches"])

    def test_wrong_amount_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 1, "2026-01-10", "success", 500.0, "Salary")),
            ])
            scenario = self._make_scenario(
                extreme_type="most expensive",
                direction="incoming",
                agent_answer="Your largest incoming was $9999.00 for Salary"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["amount_matches"])

    def test_no_matching_transactions_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 2, "2026-01-10", "success", 100.0, "Withdrawal")),
            ])
            scenario = self._make_scenario(
                extreme_type="most expensive",
                direction="incoming",
                agent_answer="No incoming transactions"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_transfer_counts_as_outgoing(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, 3, "2026-01-10", "success", 300.0, "Transfer to Savings")),
                (self.INSERT_SQL, (1, 2, "2026-01-05", "success", 50.0, "ATM Withdrawal")),
            ])
            scenario = self._make_scenario(
                extreme_type="most expensive",
                direction="outgoing",
                agent_answer="Your largest outgoing was Transfer to Savings for $300.00"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["amount_matches"])
            self.assertTrue(checks["description_matches"])

    def test_unknown_extreme_type_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(
                extreme_type="biggest",
                direction="incoming",
                agent_answer="Some answer"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
