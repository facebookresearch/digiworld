# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.payment.sign_out.scenario import (
    SignOutScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(SignOutScenario):
    def __init__(self):
        pass


class TestSignOutScenario(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_on_phone_login_screen_passes(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "PhoneLogin",
                        "route": "/screens/auth/phone-login",
                    }
                }
            },
            "userStore": {"currentUser": None},
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["signed_out"])

    def test_on_users_list_screen_passes(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "UsersList",
                        "route": "/screens/auth/users-list",
                    }
                }
            },
            "userStore": {"currentUser": None},
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["signed_out"])

    def test_on_home_screen_with_user_fails(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Home",
                        "route": "/(tabs)/home",
                    }
                }
            },
            "userStore": {
                "currentUser": {
                    "id": 1,
                    "email": "user@example.com",
                }
            },
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["signed_out"])

    def test_user_cleared_passes(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Home",
                        "route": "/(tabs)/home",
                    }
                }
            },
            "userStore": {"currentUser": None},
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["signed_out"])

    def test_user_empty_dict_passes(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Home",
                        "route": "/(tabs)/home",
                    }
                }
            },
            "userStore": {"currentUser": {}},
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["signed_out"])

    def test_missing_rootstore_raises(self):
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
