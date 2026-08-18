# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for DepositToAccountScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from .scenario import DepositToAccountScenario
from digiworld.scenarios.state_manager import StateManager

TABLES_SQL = [
    "CREATE TABLE users ("
    "id INTEGER PRIMARY KEY, email TEXT, password TEXT, pin TEXT, "
    "pin_attempts INTEGER, pin_locked_until TEXT, first_name TEXT, "
    "last_name TEXT, phone_number TEXT, created_at TEXT, updated_at TEXT, "
    "settings TEXT, status TEXT, kyc_verified INTEGER, "
    "daily_limit REAL, monthly_limit REAL)",
    "CREATE TABLE wallets ("
    "id INTEGER PRIMARY KEY, user_id INTEGER, balance REAL, currency TEXT, "
    "type TEXT, status TEXT, created_at TEXT, updated_at TEXT)",
    "CREATE TABLE transactions ("
    "id INTEGER PRIMARY KEY, sender_wallet_id INTEGER, "
    "receiver_wallet_id INTEGER, amount REAL, currency TEXT, status TEXT, "
    "type TEXT, pin_verified INTEGER, pin_verified_at TEXT, "
    "reference TEXT, description TEXT, created_at TEXT, updated_at TEXT)",
]

BASE_RECORDS = [
    (
        "INSERT INTO users (id, email, first_name, last_name, pin, status) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (1, "user@example.com", "Test", "User", "1234", "active"),
    ),
    (
        "INSERT INTO wallets (id, user_id, balance, currency, type, status) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (1, 1, 500.0, "USD", "personal", "active"),
    ),
]


def _create_db(directory, records, db_name=None):
    if db_name is None:
        db_name = os.path.basename(directory) + ".db"
    db_path = os.path.join(directory, db_name)
    conn = sqlite3.connect(db_path)
    for sql in TABLES_SQL:
        conn.execute(sql)
    for insert_sql, params in records:
        conn.execute(insert_sql, params)
    conn.commit()
    conn.close()
    return db_path


class TestDepositToAccountScenario(unittest.TestCase):
    def _make_scenario(self, initial_state_path, **kwargs):
        with patch.object(DepositToAccountScenario, '__init__', lambda self, *a, **kw: None):
            scenario = DepositToAccountScenario.__new__(DepositToAccountScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = initial_state_path
        scenario._state_manager = StateManager(scenario)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_deposit_created_passes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            _create_db(initial_dir, list(BASE_RECORDS))
            _create_db(final_dir, list(BASE_RECORDS) + [
                (
                    "INSERT INTO transactions "
                    "(id, receiver_wallet_id, amount, currency, status, type, "
                    "created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (1, 1, 200.00, "USD", "completed", "deposit",
                     "2026-02-24T10:00:00"),
                ),
            ])

            scenario = self._make_scenario(
                initial_dir, amount="200.00", deposit_method="Bank Account 1"
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["deposit_created"])

    def test_no_deposit_fails(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            _create_db(initial_dir, list(BASE_RECORDS))
            _create_db(final_dir, list(BASE_RECORDS))

            scenario = self._make_scenario(
                initial_dir, amount="200.00", deposit_method="Bank Account 1"
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["deposit_created"])

    def test_wrong_amount_fails(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            _create_db(initial_dir, list(BASE_RECORDS))
            _create_db(final_dir, list(BASE_RECORDS) + [
                (
                    "INSERT INTO transactions "
                    "(id, receiver_wallet_id, amount, currency, status, type, "
                    "created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (1, 1, 300.00, "USD", "completed", "deposit",
                     "2026-02-24T10:00:00"),
                ),
            ])

            scenario = self._make_scenario(
                initial_dir, amount="200.00", deposit_method="Bank Account 1"
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["deposit_created"])

    def test_wrong_type_fails(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            _create_db(initial_dir, list(BASE_RECORDS))
            _create_db(final_dir, list(BASE_RECORDS) + [
                (
                    "INSERT INTO transactions "
                    "(id, sender_wallet_id, amount, currency, status, type, "
                    "created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (1, 1, 200.00, "USD", "completed", "withdrawal",
                     "2026-02-24T10:00:00"),
                ),
            ])

            scenario = self._make_scenario(
                initial_dir, amount="200.00", deposit_method="Bank Account 1"
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["deposit_created"])

    def test_amount_with_dollar_sign(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            _create_db(initial_dir, list(BASE_RECORDS))
            _create_db(final_dir, list(BASE_RECORDS) + [
                (
                    "INSERT INTO transactions "
                    "(id, receiver_wallet_id, amount, currency, status, type, "
                    "created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (1, 1, 150.00, "USD", "completed", "deposit",
                     "2026-02-24T10:00:00"),
                ),
            ])

            scenario = self._make_scenario(
                initial_dir, amount="$150.00", deposit_method="Credit or Debit Card"
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["deposit_created"])

    def test_pending_status_fails(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            _create_db(initial_dir, list(BASE_RECORDS))
            _create_db(final_dir, list(BASE_RECORDS) + [
                (
                    "INSERT INTO transactions "
                    "(id, receiver_wallet_id, amount, currency, status, type, "
                    "created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (1, 1, 200.00, "USD", "pending", "deposit",
                     "2026-02-24T10:00:00"),
                ),
            ])

            scenario = self._make_scenario(
                initial_dir, amount="200.00", deposit_method="Bank Account 1"
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["deposit_created"])

    def test_missing_amount_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            _create_db(initial_dir, list(BASE_RECORDS))
            _create_db(final_dir, list(BASE_RECORDS))

            scenario = self._make_scenario(
                initial_dir, deposit_method="Bank Account 1"
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)


if __name__ == "__main__":
    unittest.main()
