# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for QwikShop settings toggle scenarios."""

import json
import os
import tempfile
import unittest

from ..change_to_dark_mode.scenario import ChangeToDarkModeScenario
from ..change_to_light_mode.scenario import ChangeToLightModeScenario
from ..turn_on_notifications.scenario import TurnOnNotificationsScenario
from ..turn_off_notifications.scenario import TurnOffNotificationsScenario

PROFILE_ROUTE = "/(app)/(drawer)/(tabs)/profile"


def _make_scenario(cls):
    scenario = object.__new__(cls)
    scenario.get_current_session = (
        lambda rs: rs.get("sessionStore", {}).get("session")
    )
    return scenario


def _make_state_path(form_data, route=PROFILE_ROUTE):
    tmpdir = tempfile.mkdtemp()
    rootstore = {
        "sessionStore": {
            "session": {
                "id": "default",
                "data": {
                    "screenName": "Profile",
                    "route": route,
                    "sessionData": {
                        "formData": form_data,
                    },
                },
            }
        }
    }
    with open(os.path.join(tmpdir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)
    return tmpdir


class TestChangeToDarkModeScenario(unittest.TestCase):
    def test_pass_dark_mode_enabled(self):
        path = _make_state_path({"isDarkMode": "true"})
        scenario = _make_scenario(ChangeToDarkModeScenario)
        self.assertTrue(scenario._check_task_completion(path))

    def test_fail_dark_mode_disabled(self):
        path = _make_state_path({"isDarkMode": "false"})
        scenario = _make_scenario(ChangeToDarkModeScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_wrong_screen(self):
        path = _make_state_path(
            {"isDarkMode": "true"}, route="/(app)/(drawer)/(tabs)/home"
        )
        scenario = _make_scenario(ChangeToDarkModeScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_no_rootstore(self):
        tmpdir = tempfile.mkdtemp()
        scenario = _make_scenario(ChangeToDarkModeScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(tmpdir)

    def test_fail_missing_form_field(self):
        path = _make_state_path({})
        scenario = _make_scenario(ChangeToDarkModeScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(path)


class TestChangeToLightModeScenario(unittest.TestCase):
    def test_pass_light_mode(self):
        path = _make_state_path({"isDarkMode": "false"})
        scenario = _make_scenario(ChangeToLightModeScenario)
        self.assertTrue(scenario._check_task_completion(path))

    def test_fail_dark_mode(self):
        path = _make_state_path({"isDarkMode": "true"})
        scenario = _make_scenario(ChangeToLightModeScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_wrong_screen(self):
        path = _make_state_path(
            {"isDarkMode": "false"}, route="/(app)/(drawer)/(tabs)/home"
        )
        scenario = _make_scenario(ChangeToLightModeScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_no_rootstore(self):
        tmpdir = tempfile.mkdtemp()
        scenario = _make_scenario(ChangeToLightModeScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(tmpdir)

    def test_fail_missing_form_field(self):
        path = _make_state_path({})
        scenario = _make_scenario(ChangeToLightModeScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(path)


class TestTurnOnNotificationsScenario(unittest.TestCase):
    def test_pass_notifications_on(self):
        path = _make_state_path({"notificationsEnabled": "true"})
        scenario = _make_scenario(TurnOnNotificationsScenario)
        self.assertTrue(scenario._check_task_completion(path))

    def test_fail_notifications_off(self):
        path = _make_state_path({"notificationsEnabled": "false"})
        scenario = _make_scenario(TurnOnNotificationsScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_wrong_screen(self):
        path = _make_state_path(
            {"notificationsEnabled": "true"}, route="/(app)/(drawer)/(tabs)/home"
        )
        scenario = _make_scenario(TurnOnNotificationsScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_no_rootstore(self):
        tmpdir = tempfile.mkdtemp()
        scenario = _make_scenario(TurnOnNotificationsScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(tmpdir)

    def test_fail_missing_form_field(self):
        path = _make_state_path({})
        scenario = _make_scenario(TurnOnNotificationsScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(path)


class TestTurnOffNotificationsScenario(unittest.TestCase):
    def test_pass_notifications_off(self):
        path = _make_state_path({"notificationsEnabled": "false"})
        scenario = _make_scenario(TurnOffNotificationsScenario)
        self.assertTrue(scenario._check_task_completion(path))

    def test_fail_notifications_on(self):
        path = _make_state_path({"notificationsEnabled": "true"})
        scenario = _make_scenario(TurnOffNotificationsScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_wrong_screen(self):
        path = _make_state_path(
            {"notificationsEnabled": "false"}, route="/(app)/(drawer)/(tabs)/home"
        )
        scenario = _make_scenario(TurnOffNotificationsScenario)
        self.assertFalse(scenario._check_task_completion(path))

    def test_fail_no_rootstore(self):
        tmpdir = tempfile.mkdtemp()
        scenario = _make_scenario(TurnOffNotificationsScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(tmpdir)

    def test_fail_missing_form_field(self):
        path = _make_state_path({})
        scenario = _make_scenario(TurnOffNotificationsScenario)
        with self.assertRaises(ValueError):
            scenario._check_task_completion(path)


if __name__ == "__main__":
    unittest.main()
