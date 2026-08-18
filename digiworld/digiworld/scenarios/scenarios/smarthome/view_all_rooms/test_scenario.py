# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ViewAllRoomsScenario


class TestViewAllRoomsScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(ViewAllRoomsScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ViewAllRoomsScenario.__new__(ViewAllRoomsScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
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

    def test_navigated_to_rooms_screen(self):
        scenario = self._make_scenario()
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "rooms", "/rooms")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["navigated_to_rooms"])

    def test_navigated_via_route_only(self):
        scenario = self._make_scenario()
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "other", "/rooms")
            checks = scenario._get_checks(tmp_dir)
        self.assertTrue(checks["navigated_to_rooms"])

    def test_wrong_screen(self):
        scenario = self._make_scenario()
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(tmp_dir, "devices", "/devices")
            checks = scenario._get_checks(tmp_dir)
        self.assertFalse(checks["navigated_to_rooms"])

    def test_missing_rootstore_raises(self):
        scenario = self._make_scenario()
        with tempfile.TemporaryDirectory() as tmp_dir:
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_empty_session_raises(self):
        scenario = self._make_scenario()
        scenario.get_current_session = lambda rootstore: {}
        with tempfile.TemporaryDirectory() as tmp_dir:
            rootstore = {"sessionStore": {"session": {}}}
            with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
                json.dump(rootstore, f)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
