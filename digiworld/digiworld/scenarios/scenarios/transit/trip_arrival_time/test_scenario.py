# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for TripArrivalTimeScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import TripArrivalTimeScenario


class TestTripArrivalTimeScenario(unittest.TestCase):
    STOPS_DDL = "CREATE TABLE stops (id TEXT PRIMARY KEY, name TEXT)"
    TRIP_OPTIONS_DDL = (
        "CREATE TABLE trip_options ("
        "id TEXT PRIMARY KEY, origin_stop_id TEXT, destination_stop_id TEXT, "
        "summary TEXT, departure_time TEXT, arrival_time TEXT, "
        "total_duration_minutes INTEGER, total_fare REAL, transfers INTEGER, "
        "walking_distance_meters INTEGER, tags TEXT, created_at TEXT)"
    )

    def _make_db(self, tmp_dir, stops, trip_options):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.STOPS_DDL)
        conn.execute(self.TRIP_OPTIONS_DDL)
        for s in stops:
            conn.execute("INSERT INTO stops (id, name) VALUES (?, ?)", s)
        for t in trip_options:
            conn.execute(
                "INSERT INTO trip_options VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", t
            )
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(
            TripArrivalTimeScenario, "__init__", lambda self, *a, **kw: None
        ):
            scenario = TripArrivalTimeScenario.__new__(TripArrivalTimeScenario)
        scenario.current_user_id = 1
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, state_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result

        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = state_dir

    def _write_rootstore(self, tmp_dir, generated_routes):
        with open(os.path.join(tmp_dir, "rootstore.json"), "w", encoding="utf-8") as file:
            json.dump(
                {
                    "tripPlannerStore": {
                        "tripState": {
                            "generatedRoutes": generated_routes,
                        }
                    }
                },
                file,
            )

    def _standard_data(self):
        stops = [("stop-8", "Seaside Terrace"), ("stop-2", "Civic Center Hub")]
        trip_options = [
            (
                "route-1", "stop-8", "stop-2", "Fastest route via T1",
                "08:05", "08:42", 37, 5.25, 0, 75,
                '["fastest","fewest-transfers"]', "2024-01-01T00:00:00Z",
            ),
            (
                "route-2", "stop-8", "stop-2", "Budget route via B1",
                "08:10", "08:55", 45, 3.50, 0, 200,
                '["lowest-cost","fewest-transfers"]', "2024-01-01T00:00:00Z",
            ),
        ]
        return stops, trip_options

    def test_correct_arrival_time_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                agent_answer="The trip arrives at 08:42",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_correct_arrival_12h_format(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                agent_answer="You would arrive at 8:42 AM",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_arrival_time_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                agent_answer="The trip arrives at 10:00",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_cheapest_optimization(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:10",
                optimization="cheapest",
                agent_answer="The trip finishes at 08:55",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_picks_closest_departure(self):
        """When multiple routes match the tag, pick closest to departure time."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:10",
                optimization="most direct",
                agent_answer="You will arrive at 08:55",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_generated_routes_override_trip_options(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(
                tmp_dir,
                [
                    {
                        "arrivalTime": "08:24",
                        "totalDuration": 19,
                        "totalFare": 3.0,
                        "transferCount": 0,
                        "routeType": "fastest",
                        "segments": [],
                    }
                ],
            )
            scenario = self._make_scenario(
                stop_1="Iron Hill",
                stop_2="Golden Gate",
                time="08:05",
                optimization="fastest",
                agent_answer="08:24",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_no_matching_trip_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops = [("stop-8", "Seaside Terrace"), ("stop-2", "Civic Center Hub")]
            self._make_db(tmp_dir, stops, [])
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_stop_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops = [("stop-8", "Seaside Terrace")]
            self._make_db(tmp_dir, stops, [])
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Nonexistent Stop",
                time="08:05",
                optimization="fastest",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_stop_1_param_raises(self):
        scenario = self._make_scenario(
            stop_2="Civic Center Hub",
            time="08:05",
            optimization="fastest",
            agent_answer="N/A",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_missing_optimization_param_raises(self):
        scenario = self._make_scenario(
            stop_1="Seaside Terrace",
            stop_2="Civic Center Hub",
            time="08:05",
            agent_answer="N/A",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_unsupported_optimization_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="scenic",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
