# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for MostRecentTransactionIdScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import MostRecentTransactionIdScenario


class TestMostRecentTransactionIdScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, wallet_records, tx_records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
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
        for sql, params in wallet_records:
            conn.execute(sql, params)
        for sql, params in tx_records:
            conn.execute(sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(MostRecentTransactionIdScenario, '__init__', lambda self, *a, **kw: None):
            scenario = MostRecentTransactionIdScenario.__new__(MostRecentTransactionIdScenario)
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

    WALLET_SQL = (
        "INSERT INTO wallets (id, user_id, balance, currency, type, status, "
        "created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    TX_SQL = (
        "INSERT INTO transactions (sender_wallet_id, receiver_wallet_id, amount, "
        "currency, status, type, reference, description, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    def test_correct_reference_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                wallet_records=[
                    (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                    (self.WALLET_SQL, (2, 2, 500.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
                tx_records=[
                    (self.TX_SQL, (1, 2, 50.0, "USD", "completed", "transfer",
                                   "TXN-001", "Lunch", "2026-02-10T10:00:00", "2026-02-10T10:00:00")),
                    (self.TX_SQL, (1, 2, 75.0, "USD", "completed", "transfer",
                                   "TXN-002", "Dinner", "2026-02-20T14:00:00", "2026-02-20T14:00:00")),
                ],
            )
            scenario = self._make_scenario(
                agent_answer="The transaction ID is TXN-002"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_reference_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                wallet_records=[
                    (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                    (self.WALLET_SQL, (2, 2, 500.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
                tx_records=[
                    (self.TX_SQL, (1, 2, 50.0, "USD", "completed", "transfer",
                                   "TXN-001", "Lunch", "2026-02-10T10:00:00", "2026-02-10T10:00:00")),
                    (self.TX_SQL, (1, 2, 75.0, "USD", "completed", "transfer",
                                   "TXN-002", "Dinner", "2026-02-20T14:00:00", "2026-02-20T14:00:00")),
                ],
            )
            scenario = self._make_scenario(
                agent_answer="The transaction ID is TXN-001"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_no_transactions_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                wallet_records=[
                    (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
                tx_records=[],
            )
            scenario = self._make_scenario(agent_answer="No transactions")
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_receiver_transaction_found(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir,
                wallet_records=[
                    (self.WALLET_SQL, (1, 1, 1000.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                    (self.WALLET_SQL, (2, 2, 500.0, "USD", "personal", "active",
                                       "2026-01-01T00:00:00", "2026-01-01T00:00:00")),
                ],
                tx_records=[
                    (self.TX_SQL, (2, 1, 200.0, "USD", "completed", "transfer",
                                   "TXN-RCV-001", "Received", "2026-02-20T14:00:00", "2026-02-20T14:00:00")),
                ],
            )
            scenario = self._make_scenario(
                agent_answer="Your most recent transaction ID is TXN-RCV-001"
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
