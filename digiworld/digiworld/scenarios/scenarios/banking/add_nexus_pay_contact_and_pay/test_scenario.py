# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddNexusPayContactAndPayScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddNexusPayContactAndPayScenario

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
]


class TestAddNexusPayContactAndPayScenario(unittest.TestCase):
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
        with patch.object(AddNexusPayContactAndPayScenario, '__init__', lambda self, *a, **kw: None):
            scenario = AddNexusPayContactAndPayScenario.__new__(AddNexusPayContactAndPayScenario)
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

    def test_contact_and_payment_both_present(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "Alice Brown", "alice@example.com")),
                ("INSERT INTO transactions (transaction_type_id, user_id, zelle_contact_id, "
                 "amount, status, transaction_date) VALUES (?, ?, ?, ?, ?, ?)",
                 (3, 1, 1, 5.00, "success", "2026-02-20")),
            ])
            scenario = self._make_scenario(
                name="Alice Brown", email="alice@example.com",
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["contact_created"])
            self.assertTrue(checks["payment_sent"])

    def test_contact_exists_but_no_payment(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "Alice Brown", "alice@example.com")),
            ])
            scenario = self._make_scenario(
                name="Alice Brown", email="alice@example.com",
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["contact_created"])
            self.assertFalse(checks["payment_sent"])

    def test_no_contact_no_payment(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(
                name="Alice Brown", email="alice@example.com",
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["contact_created"])
            self.assertFalse(checks["payment_sent"])

    def test_wrong_amount_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO zelle_contacts (id, user_id, contact_name, contact_email) "
                 "VALUES (?, ?, ?, ?)", (1, 1, "Alice Brown", "alice@example.com")),
                ("INSERT INTO transactions (transaction_type_id, user_id, zelle_contact_id, "
                 "amount, status, transaction_date) VALUES (?, ?, ?, ?, ?, ?)",
                 (3, 1, 1, 10.00, "success", "2026-02-20")),
            ])
            scenario = self._make_scenario(
                name="Alice Brown", email="alice@example.com",
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["contact_created"])
            self.assertFalse(checks["payment_sent"])

    def test_missing_name_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(email="alice@example.com", agent_answer="Done")
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
