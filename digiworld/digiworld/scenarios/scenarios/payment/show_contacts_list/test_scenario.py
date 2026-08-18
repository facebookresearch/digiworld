# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.payment.show_contacts_list.scenario import (
    ShowContactsListScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ShowContactsListScenario):
    def __init__(self):
        pass


class TestShowContactsListScenario(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_on_contacts_screen_passes(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "contacts",
                        "route": "/(tabs)/contacts",
                    }
                }
            },
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_contacts_screen"])

    def test_on_contacts_screen_mixed_case_passes(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Contacts",
                        "route": "/(tabs)/contacts",
                    }
                }
            },
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_contacts_screen"])

    def test_wrong_screen_fails(self):
        rootstore = {
            "sessionStore": {
                "session": {
                    "data": {
                        "screenName": "Home",
                        "route": "/(tabs)/home",
                    }
                }
            },
        }
        _write_rootstore(self.state_dir, rootstore)
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_contacts_screen"])

    def test_missing_rootstore_raises(self):
        os.makedirs(self.state_dir, exist_ok=True)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
