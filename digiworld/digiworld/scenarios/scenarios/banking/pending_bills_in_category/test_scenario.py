# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PendingBillsInCategoryScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import PendingBillsInCategoryScenario

TABLES_SQL = [
    "CREATE TABLE billers ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, "
    "category TEXT, subcategory TEXT, description TEXT, phone TEXT, "
    "address TEXT, requires_account_number INTEGER DEFAULT 1, "
    "accepts_credit_card INTEGER DEFAULT 1, accepts_bank_account INTEGER DEFAULT 1, "
    "min_payment_amount REAL DEFAULT 1.0, average_bill_amount REAL, "
    "payment_processing_days INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1, "
    "created_at TEXT)",
    "CREATE TABLE bills ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, biller_id INTEGER, "
    "account_id INTEGER, bill_number TEXT, amount REAL, due_date TEXT, "
    "due_day INTEGER, is_recurring INTEGER DEFAULT 0, recurrence_interval INTEGER DEFAULT 30, "
    "next_due_date TEXT, auto_pay_enabled INTEGER DEFAULT 0, auto_pay_account_id INTEGER, "
    "minimum_payment_amount REAL, status TEXT DEFAULT 'pending', paid_date TEXT, "
    "paid_amount REAL, late_fee REAL DEFAULT 0, created_at TEXT, updated_at TEXT)",
]


class TestPendingBillsInCategoryScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in TABLES_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(PendingBillsInCategoryScenario, '__init__', lambda self, *a, **kw: None):
            scenario = PendingBillsInCategoryScenario.__new__(PendingBillsInCategoryScenario)
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

    def test_has_pending_bills(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (id, code, name, category, is_active) VALUES (?, ?, ?, ?, ?)",
                 (1, "elec", "Electric Co", "utilities", 1)),
                ("INSERT INTO bills (user_id, biller_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)",
                 (1, 1, 120.00, "2026-03-15", "pending")),
                ("INSERT INTO bills (user_id, biller_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)",
                 (1, 1, 95.00, "2026-02-01", "overdue")),
            ])
            scenario = self._make_scenario(
                category="utilities",
                agent_answer="Yes, there are 2 pending bills in utilities",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])
            self.assertTrue(checks["mentions_count"])

    def test_no_pending_bills(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (id, code, name, category, is_active) VALUES (?, ?, ?, ?, ?)",
                 (1, "elec", "Electric Co", "utilities", 1)),
                ("INSERT INTO bills (user_id, biller_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)",
                 (1, 1, 120.00, "2026-01-15", "paid")),
            ])
            scenario = self._make_scenario(
                category="utilities",
                agent_answer="No, there are no pending bills in utilities",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])
            self.assertNotIn("mentions_count", checks)

    def test_wrong_answer_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (id, code, name, category, is_active) VALUES (?, ?, ?, ?, ?)",
                 (1, "elec", "Electric Co", "utilities", 1)),
                ("INSERT INTO bills (user_id, biller_id, amount, due_date, status) VALUES (?, ?, ?, ?, ?)",
                 (1, 1, 120.00, "2026-03-15", "pending")),
            ])
            scenario = self._make_scenario(
                category="utilities",
                agent_answer="No, you don't have any pending bills",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_missing_category_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(agent_answer="no")
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
