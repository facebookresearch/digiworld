# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for DistanceBetweenLocationsScenario verification logic."""

import os
import unittest
from unittest.mock import MagicMock, patch

from .scenario import DistanceBetweenLocationsScenario


def _make_scenario(**kwargs):
    with patch.object(DistanceBetweenLocationsScenario, "__init__", lambda self, *a, **kw: None):
        scenario = DistanceBetweenLocationsScenario.__new__(DistanceBetweenLocationsScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
    scenario._state_manager = MagicMock()
    scenario.agent_answer = kwargs.pop("agent_answer", "")
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestDistanceBetweenLocationsScenario(unittest.TestCase):

    ROUTE = {"distance_km": 2.66, "time_min": 4.61}

    def test_pass_correct_distance(self):
        scenario = _make_scenario(
            origin="Downtown",
            destination="Airport",
            agent_answer="The distance is 2.66 km",
        )
        scenario.get_route_between = lambda o, d: self.ROUTE
        checks = scenario._get_checks("/tmp")
        self.assertTrue(checks["answer_matches"])

    def test_pass_within_tolerance(self):
        scenario = _make_scenario(
            origin="Downtown",
            destination="Airport",
            agent_answer="The distance is about 2.7 km",
        )
        scenario.get_route_between = lambda o, d: self.ROUTE
        checks = scenario._get_checks("/tmp")
        self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_distance(self):
        scenario = _make_scenario(
            origin="Downtown",
            destination="Airport",
            agent_answer="The distance is 10 km",
        )
        scenario.get_route_between = lambda o, d: self.ROUTE
        checks = scenario._get_checks("/tmp")
        self.assertFalse(checks["answer_matches"])

    def test_fail_no_route(self):
        scenario = _make_scenario(
            origin="Nowhere",
            destination="Void",
            agent_answer="No route available",
        )
        scenario.get_route_between = lambda o, d: None
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp")


if __name__ == "__main__":
    unittest.main()
