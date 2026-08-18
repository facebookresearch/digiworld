# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CheckInitialDepositScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.check_initial_deposit.scenario import (
    CheckInitialDepositScenario,
)


def _create_state(state_dir, user_id=1):
    os.makedirs(state_dir, exist_ok=True)
    state_name = os.path.basename(state_dir)
    db_path = os.path.join(state_dir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE account_types ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, category TEXT, "
        "description TEXT, min_opening_balance REAL, has_interest INTEGER, "
        "base_interest_rate REAL)"
    )
    cur.execute(
        "INSERT INTO account_types VALUES "
        "(1,'savings','Savings Account','savings',NULL,25.0,1,0.5)"
    )
    cur.execute(
        "INSERT INTO account_types VALUES "
        "(2,'checking','Checking Account','checking',NULL,0.0,0,0.0)"
    )
    cur.execute(
        "INSERT INTO account_types VALUES "
        "(3,'ira','IRA Account','retirement',NULL,500.0,1,1.5)"
    )
    cur.execute(
        "INSERT INTO account_types VALUES "
        "(4,'money_market','Money Market Account','savings',NULL,1000.0,1,2.0)"
    )
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id, "email": "test@test.com"}},
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(CheckInitialDepositScenario):
    def __init__(self):
        pass


class TestCheckInitialDeposit(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        _create_state(self.state_dir)

        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.initial_state_path = self.state_dir
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_savings_deposit_correct(self):
        self.scenario.account_type = "savings"
        self.scenario.agent_answer = "The initial deposit is $25.00"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["answer_matches"])

    def test_ira_deposit_correct(self):
        self.scenario.account_type = "IRA"
        self.scenario.agent_answer = "You need $500 to open an IRA"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["answer_matches"])

    def test_wrong_amount_fails(self):
        self.scenario.account_type = "checking"
        self.scenario.agent_answer = "The minimum deposit is $100"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["answer_matches"])

    def test_unknown_type_raises(self):
        self.scenario.account_type = "cryptocurrency"
        self.scenario.agent_answer = "No idea"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
