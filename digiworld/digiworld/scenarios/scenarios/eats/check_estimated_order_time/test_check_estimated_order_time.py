# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.eats.test_helpers  # noqa: F401
"""Tests for CheckEstimatedOrderTimeScenario."""

import unittest
from unittest.mock import patch

from .scenario import CheckEstimatedOrderTimeScenario


class TestCheckEstimatedOrderTime(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(CheckEstimatedOrderTimeScenario, '__init__',
                          lambda self, *a, **kw: None):
            s = CheckEstimatedOrderTimeScenario.__new__(
                CheckEstimatedOrderTimeScenario)
        s.restaurant = kwargs.pop('restaurant', 'Test Restaurant')
        s.agent_answer = kwargs.pop('agent_answer', '')
        for k, v in kwargs.items():
            setattr(s, k, v)
        return s

    def test_exact_match(self):
        s = self._make_scenario(agent_answer="20 minutes")
        checks = s._get_checks("/unused")
        self.assertTrue(checks["answer_matches"])

    def test_wrong_number(self):
        s = self._make_scenario(agent_answer="30 minutes")
        checks = s._get_checks("/unused")
        self.assertFalse(checks["answer_matches"])

    def test_number_embedded_in_sentence(self):
        s = self._make_scenario(
            agent_answer="The estimated delivery time is 20 min")
        checks = s._get_checks("/unused")
        self.assertTrue(checks["answer_matches"])

    def test_no_number_in_answer(self):
        s = self._make_scenario(agent_answer="soon")
        checks = s._get_checks("/unused")
        self.assertFalse(checks["answer_matches"])

    def test_missing_restaurant_raises(self):
        s = self._make_scenario(agent_answer="20 minutes")
        del s.restaurant
        with self.assertRaises(ValueError):
            s._get_checks("/unused")


if __name__ == "__main__":
    unittest.main()
