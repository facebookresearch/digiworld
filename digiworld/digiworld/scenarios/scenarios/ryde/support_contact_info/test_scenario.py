# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SupportContactInfoScenario verification logic."""

import tempfile
import unittest

from .scenario import SupportContactInfoScenario


class _StubScenario(SupportContactInfoScenario):
    def __init__(self):
        pass


class TestSupportContactInfo(unittest.TestCase):

    def _make_scenario(self, info_type, agent_answer):
        scenario = _StubScenario()
        scenario.info_type = info_type
        scenario.agent_answer = agent_answer
        return scenario

    def test_pass_phone_number(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("number", "You can call 1-800-RYDE for help.")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_pass_email(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("email", "Reach us at support@ryde.com")
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_number(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("number", "Call us at 1-800-555-0000.")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_fail_wrong_email(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("email", "Email us at help@ryde.com")
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_fail_unknown_info_type(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario("fax", "Some answer")
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_pass_email_in_sentence(self):
        with tempfile.TemporaryDirectory() as d:
            scenario = self._make_scenario(
                "email", "The support email is support@ryde.com."
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
