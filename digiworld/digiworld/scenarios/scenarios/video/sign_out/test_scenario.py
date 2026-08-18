# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SignOutScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.video.sign_out.scenario import (
    SignOutScenario,
)


def _write_rootstore(state_dir, user, is_authenticated):
    os.makedirs(state_dir, exist_ok=True)
    rootstore = {
        "userStore": {
            "user": user,
            "isAuthenticated": is_authenticated,
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(SignOutScenario):
    def __init__(self):
        pass


class TestSignOut(unittest.TestCase):

    def _make_scenario(self):
        scenario = _StubScenario()
        scenario.agent_answer = ""
        return scenario

    def test_user_null_passes(self):
        with tempfile.TemporaryDirectory() as d:
            _write_rootstore(d, user=None, is_authenticated=False)
            scenario = self._make_scenario()
            checks = scenario._get_checks(d)
            self.assertTrue(checks["signed_out"])

    def test_not_authenticated_passes(self):
        with tempfile.TemporaryDirectory() as d:
            user = {"id": 1, "username": "test", "email": "t@e.com"}
            _write_rootstore(d, user=user, is_authenticated=False)
            scenario = self._make_scenario()
            checks = scenario._get_checks(d)
            self.assertTrue(checks["signed_out"])

    def test_still_authenticated_fails(self):
        with tempfile.TemporaryDirectory() as d:
            user = {"id": 1, "username": "test", "email": "t@e.com"}
            _write_rootstore(d, user=user, is_authenticated=True)
            scenario = self._make_scenario()
            checks = scenario._get_checks(d)
            self.assertFalse(checks["signed_out"])

    def test_missing_rootstore_raises(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario()
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_empty_user_store_passes(self):
        with tempfile.TemporaryDirectory() as d:
            os.makedirs(d, exist_ok=True)
            rootstore = {"userStore": {}}
            with open(os.path.join(d, "rootstore.json"), "w") as f:
                json.dump(rootstore, f)
            scenario = self._make_scenario()
            checks = scenario._get_checks(d)
            self.assertTrue(checks["signed_out"])


if __name__ == "__main__":
    unittest.main()
