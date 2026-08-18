# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for TripTimeBreakdownScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import TripTimeBreakdownScenario


class TestTripTimeBreakdownScenario(unittest.TestCase):
    STOPS_DDL = "CREATE TABLE stops (id TEXT PRIMARY KEY, name TEXT)"
    TRIP_OPTIONS_DDL = (
        "CREATE TABLE trip_options ("
        "id TEXT PRIMARY KEY, origin_stop_id TEXT, destination_stop_id TEXT, "
        "summary TEXT, departure_time TEXT, arrival_time TEXT, "
        "total_duration_minutes INTEGER, total_fare REAL, transfers INTEGER, "
        "walking_distance_meters INTEGER, tags TEXT, created_at TEXT)"
    )
    TRIP_STEPS_DDL = (
        "CREATE TABLE trip_steps ("
        "id TEXT PRIMARY KEY, trip_option_id TEXT, sequence INTEGER, "
        "type TEXT, description TEXT, duration_minutes INTEGER, "
        "distance_meters INTEGER, line_id TEXT, from_stop_id TEXT, "
        "to_stop_id TEXT)"
    )

    def _make_db(self, tmp_dir, stops, trip_options, trip_steps):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.STOPS_DDL)
        conn.execute(self.TRIP_OPTIONS_DDL)
        conn.execute(self.TRIP_STEPS_DDL)
        for s in stops:
            conn.execute("INSERT INTO stops (id, name) VALUES (?, ?)", s)
        for t in trip_options:
            conn.execute(
                "INSERT INTO trip_options VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", t
            )
        for ts in trip_steps:
            conn.execute(
                "INSERT INTO trip_steps VALUES (?,?,?,?,?,?,?,?,?,?)", ts
            )
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(
            TripTimeBreakdownScenario, "__init__", lambda self, *a, **kw: None
        ):
            scenario = TripTimeBreakdownScenario.__new__(
                TripTimeBreakdownScenario
            )
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
                "08:05", "08:48", 43, 5.25, 1, 275,
                '["fastest"]', "2024-01-01T00:00:00Z",
            ),
        ]
        trip_steps = [
            ("step-1", "route-1", 1, "walk", "Walk to station", 5, 75,
             None, None, None),
            ("step-2", "route-1", 2, "ride", "Ride T1", 15, None,
             "t1", "stop-8", "stop-3"),
            ("step-3", "route-1", 3, "wait", "Wait for S1", 6, None,
             None, None, None),
            ("step-4", "route-1", 4, "ride", "Ride S1", 15, None,
             "s1", "stop-3", "stop-2"),
            ("step-5", "route-1", 5, "walk", "Walk to destination", 2, 200,
             None, None, None),
        ]
        return stops, trip_options, trip_steps

    def test_total_walking_time(self):
        """walk(5) + walk(2) = 7 minutes."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options, trip_steps = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options, trip_steps)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                time_type="total walking time",
                agent_answer="There are 7 minutes of walking",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_total_transit_time(self):
        """ride(15) + ride(15) = 30 minutes."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options, trip_steps = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options, trip_steps)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                time_type="total transit time",
                agent_answer="Transit time is 30 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_total_non_walking_time(self):
        """ride(15) + wait(6) + ride(15) = 36 minutes."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options, trip_steps = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options, trip_steps)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                time_type="total non-walking time",
                agent_answer="There are 36 minutes of non-walking time",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_walking_time_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options, trip_steps = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options, trip_steps)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                time_type="total walking time",
                agent_answer="Walking takes 15 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_generated_routes_override_trip_steps(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(
                tmp_dir,
                [
                    {
                        "totalDuration": 19,
                        "totalFare": 3.0,
                        "transferCount": 0,
                        "routeType": "fastest",
                        "segments": [
                            {"duration": 3, "mode": {"type": "walk"}},
                            {"duration": 13, "mode": {"type": "subway"}},
                            {"duration": 3, "mode": {"type": "walk"}},
                        ],
                    }
                ],
            )
            scenario = self._make_scenario(
                stop_1="Iron Hill",
                stop_2="Golden Gate",
                time="08:05",
                optimization="fastest",
                time_type="total walking time",
                agent_answer="6 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_no_matching_trip_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops = [("stop-8", "Seaside Terrace"), ("stop-2", "Civic Center Hub")]
            self._make_db(tmp_dir, stops, [], [])
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                time_type="total walking time",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_no_trip_steps_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops = [("stop-8", "Seaside Terrace"), ("stop-2", "Civic Center Hub")]
            trip_options = [
                (
                    "route-1", "stop-8", "stop-2", "Route",
                    "08:05", "08:42", 37, 5.25, 0, 75,
                    '["fastest"]', "2024-01-01T00:00:00Z",
                ),
            ]
            self._make_db(tmp_dir, stops, trip_options, [])
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                optimization="fastest",
                time_type="total walking time",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_unsupported_time_type_raises(self):
        scenario = self._make_scenario(
            stop_1="Seaside Terrace",
            stop_2="Civic Center Hub",
            time="08:05",
            optimization="fastest",
            time_type="total wait time",
            agent_answer="N/A",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_missing_param_raises(self):
        scenario = self._make_scenario(
            stop_1="Seaside Terrace",
            stop_2="Civic Center Hub",
            time="08:05",
            optimization="fastest",
            agent_answer="N/A",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_missing_optimization_raises(self):
        scenario = self._make_scenario(
            stop_1="Seaside Terrace",
            stop_2="Civic Center Hub",
            time="08:05",
            time_type="total walking time",
            agent_answer="N/A",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")


if __name__ == "__main__":
    unittest.main()
