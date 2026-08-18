# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SetAccountNumberVisibilityScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.set_account_number_visibility.scenario import (
    SetAccountNumberVisibilityScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


def _write_accounts_db(state_dir, accounts):
    os.makedirs(state_dir, exist_ok=True)
    db_path = os.path.join(state_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(
        "CREATE TABLE accounts ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, account_name TEXT)"
    )
    for row in accounts:
        conn.execute(
            "INSERT INTO accounts (id, user_id, account_name) VALUES (?, ?, ?)",
            row,
        )
    conn.commit()
    conn.close()


class _StubScenario(SetAccountNumberVisibilityScenario):
    def __init__(self):
        pass


class TestSetAccountNumberVisibility(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""
        self.scenario.current_user_id = 1

        def execute_query_in_path(query, params, state_path):
            conn = sqlite3.connect(os.path.join(state_path, "default.db"))
            rows = conn.execute(query, params).fetchall()
            conn.close()
            return rows

        self.scenario._execute_query_in_path = execute_query_in_path

    def test_hidden_via_visible_account_details(self):
        _write_accounts_db(self.state_dir, [(101, 1, "My Checking")])
        rootstore = {
            "bankingStore": {"visibleAccountDetails": {"101": False}},
            "uiStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.account_name = "My Checking"
        self.scenario.visibility = "hidden"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["visibility_set"])

    def test_unhidden_via_visible_account_details(self):
        _write_accounts_db(self.state_dir, [(202, 1, "My Checking")])
        rootstore = {
            "bankingStore": {"visibleAccountDetails": {"202": True}},
            "uiStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.account_name = "My Checking"
        self.scenario.visibility = "unhidden"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["visibility_set"])

    def test_legacy_hidden_key_still_supported(self):
        _write_accounts_db(self.state_dir, [(303, 1, "My Checking")])
        rootstore = {
            "bankingStore": {"accountNumberHidden": {"My Checking": True}},
            "uiStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.account_name = "My Checking"
        self.scenario.visibility = "hidden"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["visibility_set"])

    def test_missing_rootstore_fails(self):
        os.makedirs(self.state_dir, exist_ok=True)
        _write_accounts_db(self.state_dir, [(404, 1, "My Checking")])
        self.scenario.account_name = "My Checking"
        self.scenario.visibility = "hidden"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["visibility_set"])

    def test_missing_parameters_raises(self):
        self.scenario.account_name = None
        self.scenario.visibility = "hidden"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
