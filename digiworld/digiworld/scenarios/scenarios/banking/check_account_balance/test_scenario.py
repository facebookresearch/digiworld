# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CheckAccountBalanceScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.check_account_balance.scenario import (
    CheckAccountBalanceScenario,
)


def _create_state(tmpdir, accounts, user_id=1):
    """Create a minimal state directory with a SQLite DB and rootstore."""
    state_name = os.path.basename(tmpdir)
    db_path = os.path.join(tmpdir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE account_types ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT, "
        "description TEXT, min_opening_balance REAL, has_interest INTEGER, "
        "base_interest_rate REAL)"
    )
    cur.execute(
        "INSERT INTO account_types VALUES (1,'savings','Savings','savings',NULL,25.0,1,0.5)"
    )
    cur.execute(
        "INSERT INTO account_types VALUES (2,'checking','Checking','checking',NULL,0.0,0,0.0)"
    )
    cur.execute(
        "CREATE TABLE accounts ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, account_type_id INTEGER, "
        "account_number TEXT, account_name TEXT, balance REAL, "
        "available_balance REAL, is_primary INTEGER, status TEXT)"
    )
    for acct in accounts:
        cur.execute(
            "INSERT INTO accounts VALUES (?,?,?,?,?,?,?,?,?)",
            acct,
        )
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id, "email": "test@test.com"}},
        "sessionStore": {
            "session": {"data": {"screenName": "home", "route": "/home"}}
        },
    }
    with open(os.path.join(tmpdir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)

    return tmpdir


class _StubScenario(CheckAccountBalanceScenario):
    """Bypass __init__ for unit testing."""

    def __init__(self):
        pass


class TestCheckAccountBalance(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        os.makedirs(self.state_dir)
        accounts = [
            (1, 1, 1, "1234", "Main Savings", 5000.0, 4800.50, 1, "active"),
            (2, 1, 2, "5678", "Daily Checking", 2000.0, 1950.75, 0, "active"),
        ]
        _create_state(self.state_dir, accounts)

        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.initial_state_path = self.state_dir
        from digiworld.scenarios.state_manager import StateManager

        self.scenario._state_manager = StateManager(self.scenario)

    def test_correct_balance_passes(self):
        self.scenario.account_name = "Main Savings"
        self.scenario.agent_answer = "Your available balance is $4,800.50"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["answer_matches"])

    def test_wrong_balance_fails(self):
        self.scenario.account_name = "Main Savings"
        self.scenario.agent_answer = "Your available balance is $9999.00"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["answer_matches"])

    def test_missing_account_raises(self):
        self.scenario.account_name = "Nonexistent Account"
        self.scenario.agent_answer = "balance is $0"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
