# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SendNexusPayMoneyScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import SendNexusPayMoneyScenario

TABLES_SQL = [
    "CREATE TABLE zelle_contacts ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
    "contact_name TEXT, contact_email TEXT, contact_phone TEXT, "
    "is_enrolled INTEGER DEFAULT 0, is_favorite INTEGER DEFAULT 0, "
    "last_sent_amount REAL, last_sent_date TEXT, created_at TEXT)",
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
    "CREATE TABLE accounts ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
    "account_type_id INTEGER, account_number TEXT, account_name TEXT, "
    "balance REAL, available_balance REAL, is_primary INTEGER DEFAULT 0, "
    "status TEXT DEFAULT 'active', opened_date TEXT, closed_date TEXT, "
    "created_at TEXT, updated_at TEXT, deleted_at TEXT)",
]


class TestSendNexusPayMoneyScenario(unittest.TestCase):
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
        with patch.object(SendNexusPayMoneyScenario, '__init__', lambda self, *a, **kw: None):
            scenario = SendNexusPayMoneyScenario.__new__(SendNexusPayMoneyScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
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

    def test_payment_with_correct_amount_and_memo(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO accounts (id, user_id, account_name, balance) "
                 "VALUES (?, ?, ?, ?)", (10, 1, "My Everyday Checking", 5000.0)),
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "John Doe", "john@example.com")),
                ("INSERT INTO transactions (transaction_type_id, user_id, zelle_contact_id, "
                 "from_account_id, amount, memo, status, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                 (3, 1, 1, 10, 25.00, "Dinner split", "success", "2026-02-20")),
            ])
            scenario = self._make_scenario(
                contact_name="John Doe", amount="25.00",
                account="My Everyday Checking", memo="Dinner split",
                agent_answer="Payment sent",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["payment_sent"])
            self.assertTrue(checks["memo_matches"])
            self.assertTrue(checks["from_account_matches"])

    def test_correct_amount_wrong_memo(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO accounts (id, user_id, account_name, balance) "
                 "VALUES (?, ?, ?, ?)", (10, 1, "My Everyday Checking", 5000.0)),
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "John Doe", "john@example.com")),
                ("INSERT INTO transactions (transaction_type_id, user_id, zelle_contact_id, "
                 "amount, memo, status, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (3, 1, 1, 25.00, "Wrong memo", "success", "2026-02-20")),
            ])
            scenario = self._make_scenario(
                contact_name="John Doe", amount="25.00",
                account="My Everyday Checking", memo="Dinner split",
                agent_answer="Payment sent",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["payment_sent"])
            self.assertFalse(checks["memo_matches"])

    def test_wrong_from_account(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO accounts (id, user_id, account_name, balance) "
                 "VALUES (?, ?, ?, ?)", (10, 1, "My Everyday Checking", 5000.0)),
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "John Doe", "john@example.com")),
                ("INSERT INTO transactions (transaction_type_id, user_id, zelle_contact_id, "
                 "from_account_id, amount, memo, status, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                 (3, 1, 1, 99, 25.00, "Dinner split", "success", "2026-02-20")),
            ])
            scenario = self._make_scenario(
                contact_name="John Doe", amount="25.00",
                account="My Everyday Checking", memo="Dinner split",
                agent_answer="Payment sent",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["payment_sent"])
            self.assertFalse(checks["from_account_matches"])

    def test_account_not_found_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "John Doe", "john@example.com")),
                ("INSERT INTO transactions (transaction_type_id, user_id, zelle_contact_id, "
                 "from_account_id, amount, memo, status, transaction_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                 (3, 1, 1, 10, 25.00, "Dinner split", "success", "2026-02-20")),
            ])
            scenario = self._make_scenario(
                contact_name="John Doe", amount="25.00",
                account="Nonexistent Account", memo="Dinner split",
                agent_answer="Payment sent",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["payment_sent"])
            self.assertFalse(checks["from_account_matches"])

    def test_no_payment_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO accounts (id, user_id, account_name, balance) "
                 "VALUES (?, ?, ?, ?)", (10, 1, "My Everyday Checking", 5000.0)),
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "John Doe", "john@example.com")),
            ])
            scenario = self._make_scenario(
                contact_name="John Doe", amount="25.00",
                account="My Everyday Checking", memo="Dinner split",
                agent_answer="Failed",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["payment_sent"])
            self.assertFalse(checks["memo_matches"])

    def test_contact_not_found(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(
                contact_name="Nonexistent", amount="25.00",
                account="My Everyday Checking", memo="Test",
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["payment_sent"])
            self.assertFalse(checks["memo_matches"])
            self.assertFalse(checks["from_account_matches"])

    def test_missing_contact_name_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(
                amount="25.00", account="My Everyday Checking",
                memo="Test", agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
