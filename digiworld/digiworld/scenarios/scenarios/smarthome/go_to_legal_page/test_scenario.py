# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import GoToLegalPageScenario


class TestGoToLegalPageScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(GoToLegalPageScenario, "__init__", lambda self, *a, **kw: None):
            scenario = GoToLegalPageScenario.__new__(GoToLegalPageScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.page_name = kwargs.pop("page_name", "Terms & Conditions")
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

    def test_navigated_to_terms(self):
        scenario = self._make_scenario(page_name="Terms & Conditions")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "Terms", "/terms")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["navigated_to_legal_page"])

    def test_navigated_to_privacy(self):
        scenario = self._make_scenario(page_name="Privacy Policy")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "Privacy", "/privacy")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["navigated_to_legal_page"])

    def test_wrong_screen(self):
        scenario = self._make_scenario(page_name="Terms & Conditions")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "Settings", "/settings")
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["navigated_to_legal_page"])

    def test_unknown_page_name_raises(self):
        scenario = self._make_scenario(page_name="Unknown Page")
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "Something", "/something")
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_rootstore_raises(self):
        scenario = self._make_scenario(page_name="Terms & Conditions")
        with tempfile.TemporaryDirectory() as tmp_dir:
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
