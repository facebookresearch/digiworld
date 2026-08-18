# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SetPrimaryAccountScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.set_primary_account.scenario import (
    SetPrimaryAccountScenario,
)


def _create_state(state_dir, accounts, user_id=1):
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
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id, "email": "test@test.com"}},
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(SetPrimaryAccountScenario):
    def __init__(self):
        pass


class TestSetPrimaryAccount(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.agent_answer = ""
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_correct_primary_passes(self):
        accounts = [
            (1, 1, 1, "1111", "Savings A", 1000, 1000, 0, "active"),
            (2, 1, 2, "2222", "Checking B", 2000, 2000, 1, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Checking B"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["target_is_primary"])
        self.assertTrue(checks["others_not_primary"])

    def test_wrong_primary_fails(self):
        accounts = [
            (1, 1, 1, "1111", "Savings A", 1000, 1000, 1, "active"),
            (2, 1, 2, "2222", "Checking B", 2000, 2000, 0, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Checking B"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["target_is_primary"])

    def test_multiple_primaries_fails(self):
        accounts = [
            (1, 1, 1, "1111", "Savings A", 1000, 1000, 1, "active"),
            (2, 1, 2, "2222", "Checking B", 2000, 2000, 1, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Checking B"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["target_is_primary"])
        self.assertFalse(checks["others_not_primary"])

    def test_missing_account_raises(self):
        accounts = [
            (1, 1, 1, "1111", "Savings A", 1000, 1000, 1, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Ghost Account"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
