# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for OpenNewAccountScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.open_new_account.scenario import (
    OpenNewAccountScenario,
)


def _create_state(state_dir, accounts, user_id=1):
    os.makedirs(state_dir, exist_ok=True)
    state_name = os.path.basename(state_dir)
    db_path = os.path.join(state_dir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE account_types ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT)"
    )
    cur.execute("INSERT INTO account_types VALUES (1,'checking','Everyday Checking','checking')")
    cur.execute("INSERT INTO account_types VALUES (2,'savings','Way2Save Savings','savings')")
    cur.execute("INSERT INTO account_types VALUES (3,'money_market','Money Market Account','savings')")
    cur.execute("INSERT INTO account_types VALUES (4,'ira_account','Individual Retirement Account (IRA)','retirement')")
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


class _StubScenario(OpenNewAccountScenario):
    def __init__(self):
        pass


class TestOpenNewAccount(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.agent_answer = ""
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_account_created_passes(self):
        accounts = [
            (1, 1, 2, "1111", "Existing Savings", 1000, 1000, 1, "active"),
            (2, 1, 4, "2222", "Retirement Fund", 0, 0, 0, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Retirement Fund"
        self.scenario.account_type = "IRA"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["account_created"])
        self.assertTrue(checks["type_matches"])

    def test_account_not_created_fails(self):
        accounts = [
            (1, 1, 2, "1111", "Existing Savings", 1000, 1000, 1, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Retirement Fund"
        self.scenario.account_type = "IRA"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["account_created"])

    def test_wrong_type_fails(self):
        accounts = [
            (1, 1, 1, "2222", "My Account", 500, 500, 0, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "My Account"
        self.scenario.account_type = "IRA"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["account_created"])
        self.assertFalse(checks["type_matches"])

    def test_money_market_type_matches(self):
        accounts = [
            (1, 1, 3, "3333", "Travel Fund", 5000, 5000, 0, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Travel Fund"
        self.scenario.account_type = "money market"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["account_created"])
        self.assertTrue(checks["type_matches"])

    def test_savings_type_matches(self):
        accounts = [
            (1, 1, 2, "4444", "Emergency Fund", 200, 200, 0, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Emergency Fund"
        self.scenario.account_type = "savings"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["account_created"])
        self.assertTrue(checks["type_matches"])

    def test_checking_type_matches(self):
        accounts = [
            (1, 1, 1, "5555", "Daily Spending", 100, 100, 0, "active"),
        ]
        _create_state(self.state_dir, accounts)
        self.scenario.account_name = "Daily Spending"
        self.scenario.account_type = "checking"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["account_created"])
        self.assertTrue(checks["type_matches"])


if __name__ == "__main__":
    unittest.main()
