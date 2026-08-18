# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.payment.check_transactions_by_type.scenario import (
    CheckTransactionsByTypeScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(CheckTransactionsByTypeScenario):
    def __init__(self):
        pass


class TestCheckTransactionsByType(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def _make_rootstore(self, screen_name, route, filter_value=None):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": screen_name,
                        "route": route,
                        "sessionData": {"formData": {}},
                    }
                }
            },
            "uiStore": {},
        }
        if filter_value is not None:
            rootstore["uiStore"]["transactionFilter"] = {
                "activeFilter": filter_value
            }
        return rootstore

    def test_correct_filter_passes(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "transfer"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.transaction_type = "transfer transactions"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertTrue(checks["filter_applied"])

    def test_wrong_filter_fails(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "deposit"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.transaction_type = "transfer transactions"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertFalse(checks["filter_applied"])

    def test_correct_screen_detection(self):
        rootstore = self._make_rootstore(
            "Transactions", "/(tabs)/transactions", "all"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.transaction_type = "all transactions"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])

    def test_wrong_screen_fails(self):
        rootstore = self._make_rootstore(
            "Home", "/(tabs)/home", "transfer"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.transaction_type = "transfer transactions"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_transactions_screen"])

    def test_all_transactions_default_acceptance(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.transaction_type = "all transactions"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertTrue(checks["filter_applied"])

    def test_unknown_type_raises(self):
        self.scenario.transaction_type = "invalid type"
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_missing_rootstore_returns_false(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.transaction_type = "all transactions"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_transactions_screen"])
        self.assertFalse(checks["filter_applied"])


if __name__ == "__main__":
    unittest.main()
