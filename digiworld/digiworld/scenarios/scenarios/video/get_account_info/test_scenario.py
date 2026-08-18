# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetAccountInfoScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.video.get_account_info.scenario import (
    GetAccountInfoScenario,
    FIELD_TO_KEY,
)


def _write_rootstore(state_dir, user_data):
    os.makedirs(state_dir, exist_ok=True)
    rootstore = {
        "userStore": {
            "user": user_data,
            "isAuthenticated": True,
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(GetAccountInfoScenario):
    def __init__(self):
        pass


class TestGetAccountInfo(unittest.TestCase):
    USER_DATA = {
        "id": 1,
        "username": "testuser42",
        "email": "testuser42@example.com",
        "name": "Test User",
    }

    def _make_scenario(self, field, agent_answer=""):
        scenario = _StubScenario()
        scenario.field = field
        scenario.agent_answer = agent_answer
        return scenario

    def test_name_field_pass(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, self.USER_DATA)
            scenario = self._make_scenario("name", "Your name is testuser42.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_account_name_field_pass(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, self.USER_DATA)
            scenario = self._make_scenario("account name", "testuser42")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_email_field_pass(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, self.USER_DATA)
            scenario = self._make_scenario("email", "testuser42@example.com")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_answer_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, self.USER_DATA)
            scenario = self._make_scenario("email", "wrong@email.com")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_unknown_field_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, self.USER_DATA)
            scenario = self._make_scenario("phone", "12345")
            scenario.initial_state_path = d
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_missing_rootstore_raises(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("name", "anything")
            scenario.initial_state_path = d
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, self.USER_DATA)
            scenario = self._make_scenario("email", "TESTUSER42@EXAMPLE.COM")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
