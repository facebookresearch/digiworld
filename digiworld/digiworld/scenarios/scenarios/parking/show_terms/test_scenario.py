# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ShowTermsScenario verification logic."""

import json
import os
import tempfile
import unittest

from .scenario import ShowTermsScenario


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ShowTermsScenario):
    def __init__(self):
        pass


def _make_rootstore(screen_name, route):
    return {
        "sessionStore": {
            "session": {
                "id": "default",
                "data": {
                    "screenName": screen_name,
                    "route": route,
                }
            }
        },
    }


class TestShowTermsScenario(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_on_terms_screen_passes(self):
        rootstore = _make_rootstore("Terms", "/terms")
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["navigated_to_terms"])

    def test_on_home_screen_fails(self):
        rootstore = _make_rootstore("home", "/home")
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["navigated_to_terms"])

    def test_case_insensitive(self):
        rootstore = _make_rootstore("TERMS", "/somewhere")
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["navigated_to_terms"])

    def test_missing_rootstore_raises(self):
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_route_match_without_screenname(self):
        rootstore = _make_rootstore("something", "/terms")
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["navigated_to_terms"])


if __name__ == "__main__":
    unittest.main()
