# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PayPayeeScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import PayPayeeScenario

TABLES_SQL = [
    "CREATE TABLE billers ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, "
    "category TEXT, subcategory TEXT, description TEXT, phone TEXT, "
    "address TEXT, requires_account_number INTEGER DEFAULT 1, "
    "accepts_credit_card INTEGER DEFAULT 1, accepts_bank_account INTEGER DEFAULT 1, "
    "min_payment_amount REAL DEFAULT 1.0, average_bill_amount REAL, "
    "payment_processing_days INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1, "
    "created_at TEXT)",
    "CREATE TABLE transaction_types ("
    "id INTEGER PRIMARY KEY, code TEXT, name TEXT, "
    "category TEXT, description TEXT)",
    "CREATE TABLE transactions ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, session_id INTEGER, "
    "transaction_type_id INTEGER, user_id INTEGER, from_account_id INTEGER, "
    "to_account_id INTEGER, biller_id INTEGER, bill_id INTEGER, "
    "beneficiary_id INTEGER, zelle_contact_id INTEGER, credit_card_id INTEGER, "
    "amount REAL, fee REAL DEFAULT 0, balance_before REAL, balance_after REAL, "
    "reference_id TEXT, confirmation_number TEXT, description TEXT, memo TEXT, "
    "day INTEGER, transaction_date TEXT, posted_date TEXT, pending_until TEXT, "
    "status TEXT DEFAULT 'success', failure_reason TEXT, error_code TEXT, "
    "error_message TEXT, metadata TEXT, created_at TEXT)",
    "CREATE TABLE bills ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, biller_id INTEGER, "
    "account_id INTEGER, bill_number TEXT, amount REAL, due_date TEXT, "
    "due_day INTEGER, is_recurring INTEGER DEFAULT 0, recurrence_interval INTEGER DEFAULT 30, "
    "next_due_date TEXT, auto_pay_enabled INTEGER DEFAULT 0, auto_pay_account_id INTEGER, "
    "minimum_payment_amount REAL, status TEXT DEFAULT 'pending', paid_date TEXT, "
    "paid_amount REAL, late_fee REAL DEFAULT 0, created_at TEXT, updated_at TEXT)",
    "INSERT INTO transaction_types VALUES "
    "(1, 'transfer', 'Account Transfer', 'transfer', 'Account Transfer'), "
    "(2, 'bill_payment', 'Bill Payment', 'debit', 'Bill Payment'), "
    "(3, 'zelle', 'Zelle Payment', 'transfer', 'Zelle Payment'), "
    "(4, 'external_transfer', 'External Transfer', 'transfer', 'External Transfer')",
]


class TestPayPayeeScenario(unittest.TestCase):
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
        with patch.object(PayPayeeScenario, '__init__', lambda self, *a, **kw: None):
            scenario = PayPayeeScenario.__new__(PayPayeeScenario)
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

    def test_payment_via_transaction(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (id, code, name, category) VALUES (?, ?, ?, ?)",
                 (1, "elec", "Electric Co", "utilities")),
                ("INSERT INTO transactions (transaction_type_id, user_id, biller_id, amount, status, transaction_date) "
                 "VALUES (?, ?, ?, ?, ?, ?)",
                 (2, 1, 1, 75.50, "success", "2026-02-20")),
            ])
            scenario = self._make_scenario(
                payee_name="Electric Co", amount="75.50",
                agent_answer="Payment confirmed",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["payment_recorded"])

    def test_payment_via_bill(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (id, code, name, category) VALUES (?, ?, ?, ?)",
                 (1, "elec", "Electric Co", "utilities")),
                ("INSERT INTO bills (user_id, biller_id, amount, due_date, status, paid_amount) "
                 "VALUES (?, ?, ?, ?, ?, ?)",
                 (1, 1, 75.50, "2026-03-01", "paid", 75.50)),
            ])
            scenario = self._make_scenario(
                payee_name="Electric Co", amount="75.50",
                agent_answer="Bill paid",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["payment_recorded"])

    def test_no_payment_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (id, code, name, category) VALUES (?, ?, ?, ?)",
                 (1, "elec", "Electric Co", "utilities")),
            ])
            scenario = self._make_scenario(
                payee_name="Electric Co", amount="75.50",
                agent_answer="Payment failed",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["payment_recorded"])

    def test_biller_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(
                payee_name="Nonexistent Payee", amount="50.00",
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["payment_recorded"])

    def test_missing_payee_name_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(amount="50.00", agent_answer="Done")
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
