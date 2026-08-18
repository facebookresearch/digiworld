# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for MostRecentContactScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import MostRecentContactScenario


class TestMostRecentContactScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, user_records, wallet_records=None,
                 transaction_records=None, contact_records=None,
                 db_name="default.db"):
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
        conn.execute(
            "CREATE TABLE contacts ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
            "contact_user_id INTEGER, nickname TEXT, favorite INTEGER, "
            "created_at TEXT, updated_at TEXT)"
        )
        conn.execute(
            "CREATE TABLE wallets ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
            "balance REAL, currency TEXT, type TEXT, status TEXT, "
            "created_at TEXT, updated_at TEXT)"
        )
        conn.execute(
            "CREATE TABLE transactions ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, sender_wallet_id INTEGER, "
            "receiver_wallet_id INTEGER, amount REAL, currency TEXT, "
            "status TEXT, type TEXT, pin_verified INTEGER, pin_verified_at TEXT, "
            "reference TEXT, description TEXT, created_at TEXT, updated_at TEXT)"
        )
        for sql, params in user_records:
            conn.execute(sql, params)
        for sql, params in (wallet_records or []):
            conn.execute(sql, params)
        for sql, params in (transaction_records or []):
            conn.execute(sql, params)
        for sql, params in (contact_records or []):
            conn.execute(sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(MostRecentContactScenario, '__init__', lambda self, *a, **kw: None):
            scenario = MostRecentContactScenario.__new__(MostRecentContactScenario)
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

    USER_SQL = (
        "INSERT INTO users (id, email, first_name, last_name, status) "
        "VALUES (?, ?, ?, ?, ?)"
    )
    WALLET_SQL = (
        "INSERT INTO wallets (id, user_id, balance, currency, type, status) "
        "VALUES (?, ?, ?, ?, ?, ?)"
    )
    TXN_SQL = (
        "INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, "
        "amount, currency, status, type, pin_verified, reference, "
        "created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )
    CONTACT_SQL = (
        "INSERT INTO contacts (user_id, contact_user_id, nickname, favorite, "
        "created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
    )

    def test_correct_name_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                    (self.USER_SQL, (2, "alice@x.com", "Alice", "Smith", "active")),
                    (self.USER_SQL, (3, "bob@x.com", "Bob", "Jones", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (10, 1, 1000, "USD", "personal", "active")),
                    (self.WALLET_SQL, (20, 2, 500, "USD", "personal", "active")),
                    (self.WALLET_SQL, (30, 3, 500, "USD", "personal", "active")),
                ],
                transaction_records=[
                    (self.TXN_SQL, (10, 30, 50, "USD", "completed", "transfer", 1, "txn_1", "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                    (self.TXN_SQL, (10, 20, 100, "USD", "completed", "transfer", 1, "txn_2", "2026-02-15T00:00:00", "2026-02-15T00:00:00")),
                ],
                contact_records=[
                    (self.CONTACT_SQL, (1, 2, "Ally", 0, "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                    (self.CONTACT_SQL, (1, 3, "Bobby", 0, "2026-02-15T00:00:00", "2026-02-15T00:00:00")),
                ],
            )
            scenario = self._make_scenario(
                agent_answer="Your most recent contact is Alice Smith"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_nickname_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                    (self.USER_SQL, (2, "alice@x.com", "Alice", "Smith", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (10, 1, 1000, "USD", "personal", "active")),
                    (self.WALLET_SQL, (20, 2, 500, "USD", "personal", "active")),
                ],
                transaction_records=[
                    (self.TXN_SQL, (10, 20, 100, "USD", "completed", "transfer", 1, "txn_1", "2026-02-15T00:00:00", "2026-02-15T00:00:00")),
                ],
                contact_records=[
                    (self.CONTACT_SQL, (1, 2, "Ally", 0, "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
            )
            scenario = self._make_scenario(
                agent_answer="Your most recent contact is Ally"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_name_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                    (self.USER_SQL, (2, "alice@x.com", "Alice", "Smith", "active")),
                    (self.USER_SQL, (3, "bob@x.com", "Bob", "Jones", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (10, 1, 1000, "USD", "personal", "active")),
                    (self.WALLET_SQL, (20, 2, 500, "USD", "personal", "active")),
                    (self.WALLET_SQL, (30, 3, 500, "USD", "personal", "active")),
                ],
                transaction_records=[
                    (self.TXN_SQL, (10, 30, 50, "USD", "completed", "transfer", 1, "txn_1", "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                    (self.TXN_SQL, (10, 20, 100, "USD", "completed", "transfer", 1, "txn_2", "2026-02-15T00:00:00", "2026-02-15T00:00:00")),
                ],
            )
            scenario = self._make_scenario(
                agent_answer="Your most recent contact is Bob Jones"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_no_transactions_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (10, 1, 1000, "USD", "personal", "active")),
                ],
            )
            scenario = self._make_scenario(agent_answer="No contacts found")
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_received_transaction_passes(self):
        """Most recent contact should work for incoming transactions too."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                    (self.USER_SQL, (2, "alice@x.com", "Alice", "Smith", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (10, 1, 1000, "USD", "personal", "active")),
                    (self.WALLET_SQL, (20, 2, 500, "USD", "personal", "active")),
                ],
                transaction_records=[
                    (self.TXN_SQL, (20, 10, 75, "USD", "completed", "transfer", 1, "txn_1", "2026-03-01T00:00:00", "2026-03-01T00:00:00")),
                ],
            )
            scenario = self._make_scenario(
                agent_answer="Alice Smith"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
