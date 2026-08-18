# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for NavigateToPageScenario verification logic."""

import json
import os
import tempfile
import unittest

from .scenario import NavigateToPageScenario


def _write_rootstore(state_dir, screen_name, route):
    os.makedirs(state_dir, exist_ok=True)
    rootstore = {
        "sessionStore": {
            "session": {
                "id": "default",
                "data": {"screenName": screen_name, "route": route},
            }
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


def _get_current_session(rootstore):
    session_store = rootstore.get("sessionStore", {})
    sessions = session_store.get("sessions", [])
    if sessions and isinstance(sessions, list):
        return sessions[-1]
    session = session_store.get("session", {})
    if session:
        return session
    return None


class _StubScenario(NavigateToPageScenario):
    def __init__(self):
        pass


class TestNavigateToPage(unittest.TestCase):

    def _make_scenario(self, page_name):
        scenario = _StubScenario()
        scenario.agent_answer = ""
        scenario.page_name = page_name
        scenario.get_current_session = _get_current_session
        return scenario

    def test_pass_history_page(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "History", "/(tabs)/history")
            scenario = self._make_scenario("past rides")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["on_correct_page"])

    def test_pass_payment_page(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Payment", "/(tabs)/payment")
            scenario = self._make_scenario("payment")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["on_correct_page"])

    def test_pass_help_page(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Help", "/(tabs)/help")
            scenario = self._make_scenario("help")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["on_correct_page"])

    def test_pass_terms_page(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Terms of Use", "/(tabs)/terms")
            scenario = self._make_scenario("terms of use")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["on_correct_page"])

    def test_fail_wrong_page(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "History", "/(tabs)/history")
            scenario = self._make_scenario("help")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["on_correct_page"])

    def test_fail_no_rootstore(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("help")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_fail_unknown_page(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Help", "/(tabs)/help")
            scenario = self._make_scenario("nonexistent_page")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_fail_no_session(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(d, exist_ok=True)
            rootstore = {"sessionStore": {}}
            with open(os.path.join(d, "rootstore.json"), "w") as f:
                json.dump(rootstore, f)
            scenario = self._make_scenario("help")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["on_correct_page"])


if __name__ == "__main__":
    unittest.main()
