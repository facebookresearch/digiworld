# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GoToContactProfileScenario."""

import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import GoToContactProfileScenario


class TestGoToContactProfileScenario(unittest.TestCase):
    def _make_scenario(self, **kwargs):
        with patch.object(GoToContactProfileScenario, '__init__', lambda self, *a, **kw: None):
            scenario = GoToContactProfileScenario.__new__(GoToContactProfileScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _write_rootstore(self, state_dir, rootstore_data):
        rootstore_path = os.path.join(state_dir, "rootstore.json")
        with open(rootstore_path, "w") as f:
            json.dump(rootstore_data, f)

    def test_pass_on_contact_detail_screen(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "contactDetail",
                            "route": "/screens/contact/10001",
                        },
                    }
                }
            })
            scenario = self._make_scenario(contact_name="Mom")
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["on_contact_detail_screen"])

    def test_pass_case_insensitive_screen_name(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "ContactDetail",
                            "route": "/screens/contact/42",
                        },
                    }
                }
            })
            scenario = self._make_scenario(contact_name="BestFriend")
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["on_contact_detail_screen"])

    def test_fail_wrong_screen(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "Home",
                            "route": "/(tabs)/home",
                        },
                    }
                }
            })
            scenario = self._make_scenario(contact_name="Mom")
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["on_contact_detail_screen"])

    def test_fail_no_rootstore_raises(self):
        with tempfile.TemporaryDirectory() as state_dir:
            scenario = self._make_scenario(contact_name="Mom")
            with self.assertRaises(ValueError):
                scenario._get_checks(state_dir)

    def test_fail_empty_session(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {}
            })
            scenario = self._make_scenario(contact_name="Mom")
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["on_contact_detail_screen"])

    def test_fail_contact_route_but_wrong_screen_name(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "Home",
                            "route": "/screens/contact/10001",
                        },
                    }
                }
            })
            scenario = self._make_scenario(contact_name="Mom")
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["on_contact_detail_screen"])


if __name__ == "__main__":
    unittest.main()
