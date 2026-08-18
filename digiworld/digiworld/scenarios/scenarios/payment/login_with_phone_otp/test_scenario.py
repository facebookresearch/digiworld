# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import LoginWithPhoneOtpScenario


def _write_rootstore(state_dir, rootstore):
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


def _make_scenario(**kwargs):
    with patch.object(LoginWithPhoneOtpScenario, "__init__", lambda self, *a, **kw: None):
        scenario = LoginWithPhoneOtpScenario.__new__(LoginWithPhoneOtpScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
    scenario._state_manager = MagicMock()
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestLoginWithPhoneOtpScenario(unittest.TestCase):

    def test_pass_logged_in_on_home(self):
        with tempfile.TemporaryDirectory() as state_dir:
            _write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "Home",
                            "route": "/(tabs)/home",
                        },
                    }
                },
                "userStore": {
                    "currentUser": {"id": 1, "email": "test@example.com"},
                },
            })
            scenario = _make_scenario()
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["on_home_screen"])
            self.assertTrue(checks["user_logged_in"])

    def test_pass_home_case_insensitive(self):
        with tempfile.TemporaryDirectory() as state_dir:
            _write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "home",
                            "route": "/(tabs)/home",
                        },
                    }
                },
                "userStore": {
                    "currentUser": {"id": 1},
                },
            })
            scenario = _make_scenario()
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["on_home_screen"])
            self.assertTrue(checks["user_logged_in"])

    def test_fail_on_login_screen(self):
        with tempfile.TemporaryDirectory() as state_dir:
            _write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "PhoneLogin",
                            "route": "/screens/auth/phone-login",
                        },
                    }
                },
                "userStore": {
                    "currentUser": {"id": 1},
                },
            })
            scenario = _make_scenario()
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["on_home_screen"])

    def test_fail_missing_user(self):
        with tempfile.TemporaryDirectory() as state_dir:
            _write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "Home",
                            "route": "/(tabs)/home",
                        },
                    }
                },
                "userStore": {},
            })
            scenario = _make_scenario()
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["on_home_screen"])
            self.assertFalse(checks["user_logged_in"])

    def test_fail_user_id_null(self):
        with tempfile.TemporaryDirectory() as state_dir:
            _write_rootstore(state_dir, {
                "sessionStore": {
                    "session": {
                        "id": "default",
                        "data": {
                            "screenName": "Home",
                            "route": "/(tabs)/home",
                        },
                    }
                },
                "userStore": {
                    "currentUser": {"id": None},
                },
            })
            scenario = _make_scenario()
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["user_logged_in"])

    def test_raises_on_missing_rootstore(self):
        with tempfile.TemporaryDirectory() as state_dir:
            scenario = _make_scenario()
            with self.assertRaises(ValueError):
                scenario._get_checks(state_dir)


if __name__ == "__main__":
    unittest.main()
