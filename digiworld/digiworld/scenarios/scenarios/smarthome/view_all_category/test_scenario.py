# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ViewAllCategoryScenario


class TestViewAllCategoryScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(ViewAllCategoryScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ViewAllCategoryScenario.__new__(ViewAllCategoryScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.category = kwargs.pop("category", "devices")
        scenario.get_current_session = lambda rootstore: (
            rootstore.get("sessionStore", {}).get("session", {})
        )
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _write_rootstore(self, tmp_dir, screen_name, route):
        rootstore = {
            "sessionStore": {
                "session": {
                    "id": "default",
                    "data": {
                        "screenName": screen_name,
                        "route": route,
                        "sessionData": {"interactionType": "SCREEN_MOUNTED"},
                    },
                }
            },
            "smartHomeStore": {
                "devices": [], "rooms": [], "scenes": [], "automations": []
            },
        }
        with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
            json.dump(rootstore, f)

    def test_navigated_to_devices(self):
        scenario = self._make_scenario(category="devices")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "devices", "/devices")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["on_correct_screen"])

    def test_navigated_to_automations(self):
        scenario = self._make_scenario(category="automations")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "automations", "/automations")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["on_correct_screen"])

    def test_navigated_to_notifications(self):
        scenario = self._make_scenario(category="notifications")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "notifications", "/notifications")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["on_correct_screen"])

    def test_wrong_screen(self):
        scenario = self._make_scenario(category="devices")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "rooms", "/rooms")
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["on_correct_screen"])

    def test_unknown_category_raises(self):
        scenario = self._make_scenario(category="unknown")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "unknown", "/unknown")
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_partial_match_passes(self):
        """Screen name matches but route does not -- OR logic accepts either."""
        scenario = self._make_scenario(category="devices")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "devices", "/wrong-route")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["on_correct_screen"])


if __name__ == "__main__":
    unittest.main()
