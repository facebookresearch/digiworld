# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.payment.change_home_transaction_summary.scenario import (
    ChangeHomeTransactionSummaryScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ChangeHomeTransactionSummaryScenario):
    def __init__(self):
        pass


class TestChangeHomeTransactionSummary(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def _make_rootstore(self, screen_name, route, period_value=None):
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
        if period_value is not None:
            rootstore["uiStore"]["transactionSummaryPeriod"] = period_value
        return rootstore

    def test_correct_period_on_home_passes(self):
        rootstore = self._make_rootstore(
            "Home", "/(tabs)/home", "this_week"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.period = "this week"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_home_screen"])
        self.assertTrue(checks["period_applied"])

    def test_wrong_period_fails(self):
        rootstore = self._make_rootstore(
            "Home", "/(tabs)/home", "this_month"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.period = "today"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_home_screen"])
        self.assertFalse(checks["period_applied"])

    def test_wrong_screen_fails(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "today"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.period = "today"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_home_screen"])

    def test_home_case_insensitive(self):
        rootstore = self._make_rootstore(
            "home", "/(tabs)/home", "last_month"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.period = "last month"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_home_screen"])
        self.assertTrue(checks["period_applied"])

    def test_period_from_form_data(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Home",
                        "route": "/(tabs)/home",
                        "sessionData": {
                            "formData": {
                                "transactionSummaryPeriod": "last_3_months"
                            }
                        },
                    }
                }
            },
            "uiStore": {},
        }
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.period = "last 3 months"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_home_screen"])
        self.assertTrue(checks["period_applied"])

    def test_unknown_period_raises(self):
        self.scenario.period = "last year"
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_missing_rootstore_returns_false(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.period = "today"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_home_screen"])
        self.assertFalse(checks["period_applied"])


if __name__ == "__main__":
    unittest.main()
