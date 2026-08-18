# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for LogoutScenario verification logic."""

import json
import os
import tempfile
import unittest

from .scenario import LogoutScenario


def _write_rootstore(state_dir, current_user=None, auth_token=None):
    os.makedirs(state_dir, exist_ok=True)
    rootstore = {
        "userStore": {
            "currentUser": current_user,
            "authToken": auth_token,
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(LogoutScenario):
    def __init__(self):
        pass


class TestLogout(unittest.TestCase):

    def _make_scenario(self):
        scenario = _StubScenario()
        scenario.agent_answer = ""
        return scenario

    def test_pass_logged_out(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, current_user=None, auth_token=None)
            scenario = self._make_scenario()
            checks = scenario._get_checks(d)
            self.assertTrue(checks["user_logged_out"])

    def test_pass_logged_out_empty_token(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, current_user=None, auth_token="")
            scenario = self._make_scenario()
            checks = scenario._get_checks(d)
            self.assertTrue(checks["user_logged_out"])

    def test_fail_still_logged_in(self):
        with tempfile.TemporaryDirectory() as d:
            user = {"id": 1, "name": "Jane Doe", "email": "jane@example.com"}
            _write_rootstore(d, current_user=user, auth_token="tok_abc123")
            scenario = self._make_scenario()
            checks = scenario._get_checks(d)
            self.assertFalse(checks["user_logged_out"])

    def test_fail_no_rootstore(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario()
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
