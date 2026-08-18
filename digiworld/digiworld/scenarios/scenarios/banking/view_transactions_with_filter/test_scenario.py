# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ViewTransactionsWithFilterScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.banking.view_transactions_with_filter.scenario import (
    ViewTransactionsWithFilterScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ViewTransactionsWithFilterScenario):
    def __init__(self):
        pass


class TestViewTransactionsWithFilter(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_correct_filter_on_transactions_screen(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "transactions",
                        "route": "/transactions",
                    }
                }
            },
            "uiStore": {
                "transactionFilter": {"activeFilter": "transfer"}
            },
            "bankingStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "Account Transfer"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertTrue(checks["filter_applied"])

    def test_wrong_filter_fails(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "transactions",
                        "route": "/transactions",
                    }
                }
            },
            "uiStore": {
                "transactionFilter": {"activeFilter": "all"}
            },
            "bankingStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "Bill Payment"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertFalse(checks["filter_applied"])

    def test_wrong_screen_fails(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "home",
                        "route": "/home",
                    }
                }
            },
            "uiStore": {
                "transactionFilter": {"activeFilter": "all"}
            },
            "bankingStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "All"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_transactions_screen"])

    def test_all_filter_passes(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Transactions",
                        "route": "/transactions",
                    }
                }
            },
            "uiStore": {
                "transactionFilter": {"activeFilter": "all"}
            },
            "bankingStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "All"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertTrue(checks["filter_applied"])

    def test_missing_rootstore_fails(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.filter_type = "All"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_transactions_screen"])
        self.assertFalse(checks["filter_applied"])


if __name__ == "__main__":
    unittest.main()
