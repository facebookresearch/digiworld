# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for TransferBetweenAccountsScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.transfer_between_accounts.scenario import (
    TransferBetweenAccountsScenario,
)


def _create_state(state_dir, accounts, transactions=None, user_id=1):
    os.makedirs(state_dir, exist_ok=True)
    state_name = os.path.basename(state_dir)
    db_path = os.path.join(state_dir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE accounts ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, account_type_id INTEGER, "
        "account_number TEXT, account_name TEXT, balance REAL, "
        "available_balance REAL, is_primary INTEGER, status TEXT)"
    )
    for acct in accounts:
        cur.execute("INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?)", acct)

    cur.execute(
        "CREATE TABLE transaction_types ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT)"
    )
    cur.execute(
        "INSERT INTO transaction_types VALUES (1,'transfer','Account Transfer','transfer')"
    )
    cur.execute(
        "INSERT INTO transaction_types VALUES (3,'zelle','Nexus Payment','transfer')"
    )

    cur.execute(
        "CREATE TABLE transactions ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, transaction_type_id INTEGER, "
        "from_account_id INTEGER, to_account_id INTEGER, amount REAL, "
        "description TEXT, status TEXT)"
    )
    for tx in (transactions or []):
        cur.execute(
            "INSERT INTO transactions VALUES (?,?,?,?,?,?,?,?)", tx
        )
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id, "email": "test@test.com"}},
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(TransferBetweenAccountsScenario):
    def __init__(self):
        pass


class TestTransferBetweenAccounts(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.initial_dir = os.path.join(self.tmpdir, "initial")
        self.final_dir = os.path.join(self.tmpdir, "final")
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.agent_answer = ""
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_successful_transfer(self):
        initial_accounts = [
            (1, 1, 1, "1111", "Checking", 5000, 5000, 1, "active"),
            (2, 1, 2, "2222", "Savings", 1000, 1000, 0, "active"),
        ]
        _create_state(self.initial_dir, initial_accounts)
        self.scenario.initial_state_path = self.initial_dir

        final_accounts = [
            (1, 1, 1, "1111", "Checking", 4950, 4950, 1, "active"),
            (2, 1, 2, "2222", "Savings", 1050, 1050, 0, "active"),
        ]
        final_txs = [
            (1, 1, 1, 1, 2, 50.0, "Transfer", "success"),
        ]
        _create_state(self.final_dir, final_accounts, final_txs)

        self.scenario.amount = "50"
        self.scenario.account_1 = "Checking"
        self.scenario.account_2 = "Savings"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertTrue(checks["transfer_recorded"])
        self.assertTrue(checks["balances_updated"])

    def test_no_transaction_fails(self):
        initial_accounts = [
            (1, 1, 1, "1111", "Checking", 5000, 5000, 1, "active"),
            (2, 1, 2, "2222", "Savings", 1000, 1000, 0, "active"),
        ]
        _create_state(self.initial_dir, initial_accounts)
        _create_state(self.final_dir, initial_accounts)
        self.scenario.initial_state_path = self.initial_dir

        self.scenario.amount = "50"
        self.scenario.account_1 = "Checking"
        self.scenario.account_2 = "Savings"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertFalse(checks["transfer_recorded"])

    def test_wrong_type_not_matched(self):
        """A zelle transaction (type 3) should NOT match as an account transfer."""
        initial_accounts = [
            (1, 1, 1, "1111", "Checking", 5000, 5000, 1, "active"),
            (2, 1, 2, "2222", "Savings", 1000, 1000, 0, "active"),
        ]
        _create_state(self.initial_dir, initial_accounts)
        self.scenario.initial_state_path = self.initial_dir

        final_accounts = [
            (1, 1, 1, "1111", "Checking", 4950, 4950, 1, "active"),
            (2, 1, 2, "2222", "Savings", 1050, 1050, 0, "active"),
        ]
        final_txs = [
            (1, 1, 3, 1, 2, 50.0, "Zelle Payment", "success"),
        ]
        _create_state(self.final_dir, final_accounts, final_txs)

        self.scenario.amount = "50"
        self.scenario.account_1 = "Checking"
        self.scenario.account_2 = "Savings"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertFalse(checks["transfer_recorded"])

    def test_missing_account_raises(self):
        accounts = [
            (1, 1, 1, "1111", "Checking", 5000, 5000, 1, "active"),
        ]
        _create_state(self.initial_dir, accounts)
        _create_state(self.final_dir, accounts)
        self.scenario.initial_state_path = self.initial_dir

        self.scenario.amount = "50"
        self.scenario.account_1 = "Checking"
        self.scenario.account_2 = "Nonexistent"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.final_dir)


if __name__ == "__main__":
    unittest.main()
