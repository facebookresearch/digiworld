# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ToggleSettingScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.transit.toggle_setting.scenario import (
    ToggleSettingScenario,
)


def _create_state(state_dir, notifications_enabled=True, location_enabled=True):
    os.makedirs(state_dir, exist_ok=True)

    rootstore = {
        "userStore": {"currentUser": {"id": 1, "email": "test@test.com"}},
        "profileStore": {
            "profileState": {
                "homeStopId": "stop-8",
                "homeStopName": "Seaside Terrace",
                "workStopId": "stop-2",
                "workStopName": "Civic Center Hub",
                "preferredModes": ["subway", "train"],
                "notificationsEnabled": notifications_enabled,
                "locationEnabled": location_enabled,
            }
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ToggleSettingScenario):
    def __init__(self):
        pass


class TestToggleSetting(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.final_dir = os.path.join(self.tmpdir, "final")
        self.initial_dir = os.path.join(self.tmpdir, "initial")
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.agent_answer = ""

    def test_disable_notifications_passes(self):
        _create_state(self.initial_dir, notifications_enabled=True)
        _create_state(self.final_dir, notifications_enabled=False)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Disable"
        self.scenario.setting = "push notifications"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertTrue(checks["setting_matches"])

    def test_disable_location_passes(self):
        _create_state(self.initial_dir, location_enabled=True)
        _create_state(self.final_dir, location_enabled=False)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Disable"
        self.scenario.setting = "location services"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertTrue(checks["setting_matches"])

    def test_enable_when_already_enabled_fails(self):
        _create_state(self.initial_dir, notifications_enabled=True)
        _create_state(self.final_dir, notifications_enabled=True)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Enable"
        self.scenario.setting = "push notifications"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertFalse(checks["setting_matches"])

    def test_disable_when_already_disabled_fails(self):
        _create_state(self.initial_dir, location_enabled=False)
        _create_state(self.final_dir, location_enabled=False)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Disable"
        self.scenario.setting = "location services"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertFalse(checks["setting_matches"])

    def test_enable_from_disabled_passes(self):
        _create_state(self.initial_dir, notifications_enabled=False)
        _create_state(self.final_dir, notifications_enabled=True)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Enable"
        self.scenario.setting = "push notifications"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertTrue(checks["setting_matches"])

    def test_wrong_final_value_fails(self):
        _create_state(self.initial_dir, notifications_enabled=True)
        _create_state(self.final_dir, notifications_enabled=True)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Disable"
        self.scenario.setting = "push notifications"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertFalse(checks["setting_matches"])

    def test_unknown_setting_raises(self):
        _create_state(self.final_dir)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Enable"
        self.scenario.setting = "dark mode"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.final_dir)

    def test_missing_rootstore_raises(self):
        os.makedirs(self.final_dir, exist_ok=True)
        self.scenario.initial_state_path = self.initial_dir
        self.scenario.action = "Enable"
        self.scenario.setting = "push notifications"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.final_dir)

    def test_no_initial_state_still_works(self):
        _create_state(self.final_dir, location_enabled=False)
        self.scenario.initial_state_path = "/nonexistent/path"
        self.scenario.action = "Disable"
        self.scenario.setting = "location services"
        checks = self.scenario._get_checks(self.final_dir)
        self.assertTrue(checks["setting_matches"])


if __name__ == "__main__":
    unittest.main()
