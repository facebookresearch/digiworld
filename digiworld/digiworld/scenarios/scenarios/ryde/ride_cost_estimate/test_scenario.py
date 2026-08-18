# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for RideCostEstimateScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import RideCostEstimateScenario

RIDE_OPTIONS_DDL = (
    "CREATE TABLE ride_options ("
    "id INTEGER PRIMARY KEY, name TEXT, base_fare REAL, "
    "rate_per_km REAL, icon TEXT)"
)


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_scenario(**kwargs):
    with patch.object(RideCostEstimateScenario, "__init__", lambda self, *a, **kw: None):
        scenario = RideCostEstimateScenario.__new__(RideCostEstimateScenario)
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = kwargs.pop("agent_answer", "")
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestRideCostEstimateScenario(unittest.TestCase):

    OPTION_ROWS = [
        (1, "Economy", 2.0, 1.2, "car"),
        (2, "Premium", 5.0, 3.0, "star-car"),
    ]

    def _make_db(self, tmp_dir, rows):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(RIDE_OPTIONS_DDL)
        for row in rows:
            conn.execute(
                "INSERT INTO ride_options VALUES (?, ?, ?, ?, ?)", row,
            )
        conn.commit()
        conn.close()

    def test_pass_economy(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.OPTION_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                origin="A",
                destination="B",
                car_type="Economy",
                agent_answer="The estimated fare is $12",
            )
            scenario.get_route_between = lambda o, dest: {"distance_km": 10.0, "time_min": 15.0}
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_pass_premium(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.OPTION_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                origin="C",
                destination="D",
                car_type="Premium",
                agent_answer="That would cost about 15 dollars",
            )
            scenario.get_route_between = lambda o, dest: {"distance_km": 5.0, "time_min": 8.0}
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_fare(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.OPTION_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                origin="A",
                destination="B",
                car_type="Economy",
                agent_answer="The fare is $50",
            )
            scenario.get_route_between = lambda o, dest: {"distance_km": 10.0, "time_min": 15.0}
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_fail_no_ride_option(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.OPTION_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                origin="A",
                destination="B",
                car_type="Helicopter",
                agent_answer="$100",
            )
            scenario.get_route_between = lambda o, dest: {"distance_km": 10.0, "time_min": 15.0}
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_fail_no_route(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.OPTION_ROWS)
            scenario = _make_scenario(
                initial_state_path=d,
                origin="Nowhere",
                destination="Void",
                car_type="Economy",
                agent_answer="$10",
            )
            scenario.get_route_between = lambda o, dest: None
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
