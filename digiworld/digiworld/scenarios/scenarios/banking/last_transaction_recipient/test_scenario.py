# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for LastTransactionRecipientScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import LastTransactionRecipientScenario


class TestLastTransactionRecipientScenario(unittest.TestCase):
    TABLES_SQL = [
        "CREATE TABLE transaction_types ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT)",
        "CREATE TABLE transactions ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
        "transaction_type_id INTEGER, "
        "biller_id INTEGER, zelle_contact_id INTEGER, beneficiary_id INTEGER, "
        "to_account_id INTEGER, transaction_date TEXT, status TEXT, "
        "amount REAL, description TEXT)",
        "CREATE TABLE billers ("
        "id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE TABLE zelle_contacts ("
        "id INTEGER PRIMARY KEY, contact_name TEXT)",
        "CREATE TABLE beneficiaries ("
        "id INTEGER PRIMARY KEY, name TEXT)",
        "CREATE TABLE accounts ("
        "id INTEGER PRIMARY KEY, account_name TEXT)",
    ]

    SEED_TX_TYPES = [
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (1, "transfer", "Account Transfer", "transfer")),
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (2, "bill_payment", "Bill Payment", "debit")),
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (3, "zelle", "Nexus Payment", "transfer")),
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (5, "deposit", "Deposit", "credit")),
        ("INSERT INTO transaction_types VALUES (?, ?, ?, ?)", (6, "withdrawal", "Withdrawal", "debit")),
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
        with patch.object(LastTransactionRecipientScenario, '__init__', lambda self, *a, **kw: None):
            scenario = LastTransactionRecipientScenario.__new__(LastTransactionRecipientScenario)
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

    def test_biller_recipient(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO billers VALUES (?, ?)", (10, "Electric Company")),
                ("INSERT INTO transactions (user_id, transaction_type_id, biller_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (1, 2, 10, "2026-02-20T10:00:00", "success", 150.0, "Bill Payment")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was to Electric Company"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_zelle_recipient(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO zelle_contacts VALUES (?, ?)", (5, "Jane Doe")),
                ("INSERT INTO transactions (user_id, transaction_type_id, zelle_contact_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (1, 3, 5, "2026-02-20T10:00:00", "success", 200.0, "Zelle Payment")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was sent to Jane Doe"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_skips_deposit_gets_outgoing(self):
        """A deposit (credit) should be skipped; the most recent outgoing wins."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO billers VALUES (?, ?)", (10, "Electric Company")),
                ("INSERT INTO transactions (user_id, transaction_type_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?)",
                 (1, 5, "2026-02-25T12:00:00", "success", 3000.0, "Salary Deposit")),
                ("INSERT INTO transactions (user_id, transaction_type_id, biller_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (1, 2, 10, "2026-02-20T10:00:00", "success", 150.0, "Bill Payment")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was to Electric Company"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_description_fallback(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO transactions (user_id, transaction_type_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?)",
                 (1, 6, "2026-02-20T10:00:00", "success", 50.0, "ATM Withdrawal")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was ATM Withdrawal"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_recipient_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO billers VALUES (?, ?)", (10, "Electric Company")),
                ("INSERT INTO transactions (user_id, transaction_type_id, biller_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (1, 2, 10, "2026-02-20T10:00:00", "success", 150.0, "Bill Payment")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was to Water Company"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_no_outgoing_transactions_returns_false(self):
        """Only deposits exist — should return answer_matches=False."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO transactions (user_id, transaction_type_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?)",
                 (1, 5, "2026-02-20T10:00:00", "success", 1000.0, "Salary Deposit")),
            ])
            scenario = self._make_scenario(agent_answer="No transactions")
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_no_transactions_returns_false(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(agent_answer="No transactions")
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_beneficiary_recipient(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO beneficiaries VALUES (?, ?)", (3, "John Smith")),
                ("INSERT INTO transactions (user_id, transaction_type_id, beneficiary_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (1, 1, 3, "2026-02-20T10:00:00", "success", 500.0, "External Transfer")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was to John Smith"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_tiebreaker_uses_highest_id(self):
        """When two outgoing transactions share the same timestamp, pick highest id."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("INSERT INTO billers VALUES (?, ?)", (10, "Electric Company")),
                ("INSERT INTO billers VALUES (?, ?)", (11, "Water Company")),
                ("INSERT INTO transactions (user_id, transaction_type_id, biller_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (1, 2, 10, "2026-02-20T10:00:00", "success", 100.0, "Electric Bill")),
                ("INSERT INTO transactions (user_id, transaction_type_id, biller_id, transaction_date, status, amount, description) "
                 "VALUES (?, ?, ?, ?, ?, ?, ?)",
                 (1, 2, 11, "2026-02-20T10:00:00", "success", 200.0, "Water Bill")),
            ])
            scenario = self._make_scenario(
                agent_answer="Your last transaction was to Water Company"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
