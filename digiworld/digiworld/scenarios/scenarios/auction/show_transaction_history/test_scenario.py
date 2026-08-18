# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.auction.test_helpers  # noqa: F401  # mock heavy deps
"""Tests for ShowTransactionHistoryScenario."""

import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ShowTransactionHistoryScenario


class TestShowTransactionHistoryScenario(unittest.TestCase):
    def _make_scenario(self, **kwargs):
        with patch.object(ShowTransactionHistoryScenario, '__init__', lambda self, *a, **kw: None):
            scenario = ShowTransactionHistoryScenario.__new__(ShowTransactionHistoryScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _make_rootstore(self, tmp_dir, screen_name, route, active_filter="all"):
        rootstore = {
            "sessionStore": {
                "session": {
                    "id": "default",
                    "data": {
                        "screenName": screen_name,
                        "route": route,
                        "startTime": 0, "endTime": 0,
                        "sessionData": {}, "action": "", "timestamp": 0,
                    },
                },
            },
            "uiStore": {
                "transactionFilter": {
                    "activeFilter": active_filter,
                },
            },
        }
        with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
            json.dump(rootstore, f)

    def test_pass_correct_filter(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_rootstore(d, "transactions", "/history", active_filter="purchase")
            s = self._make_scenario(transactionType="purchase")
            s.get_current_session = lambda rs: rs.get('sessionStore', {}).get('session', {})
            self.assertTrue(s._check_task_completion(d))

    def test_pass_bid_win_filter(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_rootstore(d, "transactions", "/history", active_filter="bid_win")
            s = self._make_scenario(transactionType="bid_win")
            s.get_current_session = lambda rs: rs.get('sessionStore', {}).get('session', {})
            self.assertTrue(s._check_task_completion(d))

    def test_fail_wrong_filter(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_rootstore(d, "transactions", "/history", active_filter="all")
            s = self._make_scenario(transactionType="purchase")
            s.get_current_session = lambda rs: rs.get('sessionStore', {}).get('session', {})
            self.assertFalse(s._check_task_completion(d))

    def test_fail_wrong_screen(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_rootstore(d, "home", "/dashboard", active_filter="purchase")
            s = self._make_scenario(transactionType="purchase")
            s.get_current_session = lambda rs: rs.get('sessionStore', {}).get('session', {})
            self.assertFalse(s._check_task_completion(d))

    def test_fail_no_rootstore(self):
        with tempfile.TemporaryDirectory() as d:
            s = self._make_scenario(transactionType="purchase")
            s.get_current_session = lambda rs: rs.get('sessionStore', {}).get('session', {})
            self.assertFalse(s._check_task_completion(d))


if __name__ == "__main__":
    unittest.main()
