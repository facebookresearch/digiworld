# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for RecentTransactionDetailScenario verification logic."""

import datetime
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import RecentTransactionDetailScenario


class TestRecentTransactionDetailScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, user_records, wallet_records, tx_records,
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
        for sql, params in wallet_records:
            conn.execute(sql, params)
        for sql, params in tx_records:
            conn.execute(sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(RecentTransactionDetailScenario, '__init__', lambda self, *a, **kw: None):
            scenario = RecentTransactionDetailScenario.__new__(RecentTransactionDetailScenario)
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
        "INSERT INTO wallets (id, user_id, balance, currency, type, status, "
        "created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    TX_SQL = (
        "INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, "
        "currency, status, type, reference, description, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    def _standard_db(self, tmp_dir):
        return self._make_db(tmp_dir,
            user_records=[
                (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                (self.USER_SQL, (2, "alice@x.com", "Alice", "Smith", "active")),
            ],
            wallet_records=[
                (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                   "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                (self.WALLET_SQL, (2, 2, 500.0, "USD", "personal", "active",
                                   "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
            ],
            tx_records=[
                (self.TX_SQL, (1, 2, 75.0, "USD", "completed", "transfer",
                               "TXN-ABC-123", "Dinner split",
                               "2026-02-20T14:30:00", "2026-02-20T14:30:00")),
            ],
        )

    def test_reference_number_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="reference number",
                agent_answer="The reference number is TXN-ABC-123"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_reference_number_wrong(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="reference number",
                agent_answer="The reference number is TXN-WRONG"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_date_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="date",
                agent_answer="The transaction date was February 20, 2026"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_date_passes_with_dd_mm_yyyy(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="date",
                agent_answer="The transaction date was 20-02-2026"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_date_wrong(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="date",
                agent_answer="The transaction date was January 1, 2026"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_time_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="time",
                agent_answer="The transaction was at 2:30 PM"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_time_passes_with_localized_time(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                    (self.USER_SQL, (2, "alice@x.com", "Alice", "Smith", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                    (self.WALLET_SQL, (2, 2, 500.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
                tx_records=[
                    (self.TX_SQL, (1, 2, 75.0, "USD", "completed", "transfer",
                                   "TXN-ABC-123", "Dinner split",
                                   "2026-02-21T20:01:26.000Z", "2026-02-21T20:01:26.000Z")),
                ],
            )
            scenario = self._make_scenario(
                detail_type="time",
                agent_answer="The transaction was at 1:31 AM"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_candidate_datetimes_include_local_display_time(self):
        datetimes = RecentTransactionDetailScenario._candidate_datetimes(
            "2026-02-21T20:01:26.000Z"
        )
        self.assertEqual(len(datetimes), 2)
        self.assertEqual(datetimes[0].hour, 20)
        self.assertEqual(datetimes[1].hour, 1)
        self.assertEqual(datetimes[1].day, 22)

    def test_time_wrong(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="time",
                agent_answer="The transaction was at 10:00 AM"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_recipient_email_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="recipient email address",
                agent_answer="The recipient email is alice@x.com"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_recipient_email_wrong(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="recipient email address",
                agent_answer="The recipient email is bob@x.com"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_recipient_email_non_transfer_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
                tx_records=[
                    (self.TX_SQL, (1, None, 200.0, "USD", "completed", "deposit",
                                   "DEP-001", "ATM Deposit",
                                   "2026-02-20T14:30:00", "2026-02-20T14:30:00")),
                ],
            )
            scenario = self._make_scenario(
                detail_type="recipient email address",
                agent_answer="alice@x.com"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_no_transactions_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                user_records=[
                    (self.USER_SQL, (1, "me@x.com", "Me", "User", "active")),
                ],
                wallet_records=[
                    (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
                tx_records=[],
            )
            scenario = self._make_scenario(
                detail_type="reference number",
                agent_answer="No transactions"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_unknown_detail_type_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._standard_db(tmp_dir)
            scenario = self._make_scenario(
                detail_type="sender name",
                agent_answer="Me User"
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
