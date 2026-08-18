# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.payment.filter_transactions_by_type_and_date.scenario import (
    FilterTransactionsByTypeAndDateScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(FilterTransactionsByTypeAndDateScenario):
    def __init__(self):
        pass


class TestFilterTransactionsByTypeAndDate(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def _make_rootstore(
        self, screen_name, route, type_filter=None, date_range=None
    ):
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
        ui = rootstore["uiStore"]
        if type_filter is not None or date_range is not None:
            tx_filter = {}
            if type_filter is not None:
                tx_filter["activeFilter"] = type_filter
            if date_range is not None:
                tx_filter["dateRange"] = date_range
            ui["transactionFilter"] = tx_filter
        return rootstore

    def test_both_filters_match(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "transfer", "this_week"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "transfer"
        self.scenario.date_range = "this week"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertTrue(checks["type_filter_applied"])
        self.assertTrue(checks["date_filter_applied"])

    def test_type_matches_date_wrong(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "deposit", "this_month"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "deposit"
        self.scenario.date_range = "today"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertTrue(checks["type_filter_applied"])
        self.assertFalse(checks["date_filter_applied"])

    def test_date_matches_type_wrong(self):
        rootstore = self._make_rootstore(
            "Transactions", "/(tabs)/transactions", "withdrawal", "today"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "deposit"
        self.scenario.date_range = "today"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_transactions_screen"])
        self.assertFalse(checks["type_filter_applied"])
        self.assertTrue(checks["date_filter_applied"])

    def test_wrong_screen(self):
        rootstore = self._make_rootstore(
            "Home", "/(tabs)/home", "transfer", "this_week"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "transfer"
        self.scenario.date_range = "this week"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_transactions_screen"])

    def test_all_type_default_acceptance(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", date_range="last_3_months"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "all"
        self.scenario.date_range = "the last three months"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["type_filter_applied"])
        self.assertTrue(checks["date_filter_applied"])

    def test_last_3_months_alias(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "all", "last_3_months"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "all"
        self.scenario.date_range = "the last 3 months"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["type_filter_applied"])
        self.assertTrue(checks["date_filter_applied"])

    def test_accepts_app_year_value(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "withdrawal", "year"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "withdrawal"
        self.scenario.date_range = "this year"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["type_filter_applied"])
        self.assertTrue(checks["date_filter_applied"])

    def test_accepts_app_3months_value(self):
        rootstore = self._make_rootstore(
            "transactions", "/(tabs)/transactions", "all", "3months"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.filter_type = "all"
        self.scenario.date_range = "the last three months"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["type_filter_applied"])
        self.assertTrue(checks["date_filter_applied"])

    def test_unknown_filter_type_raises(self):
        self.scenario.filter_type = "invalid"
        self.scenario.date_range = "today"
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_unknown_date_range_raises(self):
        self.scenario.filter_type = "all"
        self.scenario.date_range = "last decade"
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_missing_rootstore_returns_false(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.filter_type = "all"
        self.scenario.date_range = "today"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_transactions_screen"])
        self.assertFalse(checks["type_filter_applied"])
        self.assertFalse(checks["date_filter_applied"])


if __name__ == "__main__":
    unittest.main()
