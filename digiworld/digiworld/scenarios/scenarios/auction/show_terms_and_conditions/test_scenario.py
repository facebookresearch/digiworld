# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.auction.test_helpers  # noqa: F401  # mock heavy deps
"""Tests for ShowTermsAndConditionsScenario."""

import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ShowTermsAndConditionsScenario


class TestShowTermsAndConditionsScenario(unittest.TestCase):
    def _make_scenario(self, **kwargs):
        with patch.object(ShowTermsAndConditionsScenario, '__init__', lambda self, *a, **kw: None):
            scenario = ShowTermsAndConditionsScenario.__new__(ShowTermsAndConditionsScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _write_rootstore(self, state_dir, rootstore_data):
        rootstore_path = os.path.join(state_dir, "rootstore.json")
        with open(rootstore_path, "w") as f:
            json.dump(rootstore_data, f)

    def test_pass_screen_name_terms(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "sessions": [
                        {"data": {"screenName": "Terms", "route": "/terms"}}
                    ]
                }
            })
            scenario = self._make_scenario()
            self.assertTrue(scenario._check_task_completion(state_dir))

    def test_pass_route_terms(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "sessions": [
                        {"data": {"screenName": "", "route": "/terms"}}
                    ]
                }
            })
            scenario = self._make_scenario()
            self.assertTrue(scenario._check_task_completion(state_dir))

    def test_fail_wrong_screen(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "sessions": [
                        {"data": {"screenName": "Home", "route": "/home"}}
                    ]
                }
            })
            scenario = self._make_scenario()
            self.assertFalse(scenario._check_task_completion(state_dir))

    def test_fail_no_rootstore(self):
        with tempfile.TemporaryDirectory() as state_dir:
            scenario = self._make_scenario()
            self.assertFalse(scenario._check_task_completion(state_dir))

    def test_fail_empty_session_store(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {"sessions": []}
            })
            scenario = self._make_scenario()
            self.assertFalse(scenario._check_task_completion(state_dir))

    def test_pass_multiple_sessions_last_is_terms(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "sessions": [
                        {"data": {"screenName": "Home", "route": "/home"}},
                        {"data": {"screenName": "Settings", "route": "/settings"}},
                        {"data": {"screenName": "Terms", "route": "/terms"}},
                    ]
                }
            })
            scenario = self._make_scenario()
            self.assertTrue(scenario._check_task_completion(state_dir))


if __name__ == "__main__":
    unittest.main()
