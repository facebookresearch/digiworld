# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ShowNotificationsScenario verification logic."""

import json
import os
import tempfile
import unittest

from .scenario import ShowNotificationsScenario


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ShowNotificationsScenario):
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


class TestShowNotificationsScenario(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_on_notifications_screen_passes(self):
        rootstore = _make_rootstore("notifications", "/notifications/notifications")
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["navigated_to_notifications"])

    def test_on_home_screen_fails(self):
        rootstore = _make_rootstore("home", "/home")
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["navigated_to_notifications"])

    def test_route_match(self):
        rootstore = _make_rootstore("other", "/app/notifications")
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["navigated_to_notifications"])

    def test_missing_rootstore_raises(self):
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
