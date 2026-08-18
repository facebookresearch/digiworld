# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for NavigateToLegalScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.video.navigate_to_legal.scenario import (
    NavigateToLegalScenario,
)


def _write_rootstore(state_dir, screen_name, route):
    os.makedirs(state_dir, exist_ok=True)
    rootstore = {
        "sessionStore": {
            "session": {
                "data": {
                    "screenName": screen_name,
                    "route": route,
                }
            }
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(NavigateToLegalScenario):
    def __init__(self):
        pass


class TestNavigateToLegal(unittest.TestCase):

    def _make_scenario(self, page):
        scenario = _StubScenario()
        scenario.page = page
        scenario.agent_answer = ""
        return scenario

    def test_terms_route_passes(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Legal", "/terms")
            scenario = self._make_scenario("Terms & Conditions")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["navigated_correctly"])

    def test_privacy_route_passes(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Legal", "/privacy")
            scenario = self._make_scenario("Privacy Policy")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["navigated_correctly"])

    def test_terms_screen_name_passes(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Terms", "/settings/legal")
            scenario = self._make_scenario("Terms & Conditions")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["navigated_correctly"])

    def test_wrong_page_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Home", "/home")
            scenario = self._make_scenario("Terms & Conditions")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["navigated_correctly"])

    def test_privacy_when_expecting_terms_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Privacy", "/privacy")
            scenario = self._make_scenario("Terms & Conditions")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["navigated_correctly"])

    def test_terms_when_expecting_privacy_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Terms", "/terms")
            scenario = self._make_scenario("Privacy Policy")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["navigated_correctly"])

    def test_missing_rootstore_raises(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("Privacy Policy")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_unknown_page_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "Help", "/help")
            scenario = self._make_scenario("About Us")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_case_insensitive_route(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, "SomePage", "/Settings/Terms/View")
            scenario = self._make_scenario("Terms & Conditions")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["navigated_correctly"])


if __name__ == "__main__":
    unittest.main()
