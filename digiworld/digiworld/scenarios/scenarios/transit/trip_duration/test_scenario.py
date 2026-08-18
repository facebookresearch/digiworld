# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for TripDurationScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import TripDurationScenario


class TestTripDurationScenario(unittest.TestCase):
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
            TripDurationScenario, "__init__", lambda self, *a, **kw: None
        ):
            scenario = TripDurationScenario.__new__(TripDurationScenario)
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

    def test_correct_duration_first_route(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                agent_answer="The trip takes 37 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_correct_duration_second_route(self):
        """Any valid duration between the stops should pass."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                agent_answer="It would take about 45 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_duration_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops, trip_options = self._standard_data()
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
                agent_answer="The trip takes 60 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_single_route(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops = [
                ("stop-2", "Civic Center Hub"),
                ("stop-5", "Innovation Park"),
            ]
            trip_options = [
                (
                    "route-4", "stop-2", "stop-5", "Direct subway via S3",
                    "09:00", "09:25", 25, 4.00, 0, 120,
                    '["fastest","fewest-transfers"]', "2024-01-01T00:00:00Z",
                ),
            ]
            self._make_db(tmp_dir, stops, trip_options)
            scenario = self._make_scenario(
                stop_1="Civic Center Hub",
                stop_2="Innovation Park",
                time="09:00",
                agent_answer="The trip is 25 minutes long",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_generated_routes_use_fastest_default(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._write_rootstore(
                tmp_dir,
                [
                    {"totalDuration": 45, "totalFare": 2.0, "transferCount": 0},
                    {"totalDuration": 19, "totalFare": 3.0, "transferCount": 0},
                ],
            )
            scenario = self._make_scenario(
                stop_1="Iron Hill",
                stop_2="Golden Gate",
                time="08:05",
                agent_answer="19 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_no_trip_options_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            stops = [("stop-8", "Seaside Terrace"), ("stop-2", "Civic Center Hub")]
            self._make_db(tmp_dir, stops, [])
            scenario = self._make_scenario(
                stop_1="Seaside Terrace",
                stop_2="Civic Center Hub",
                time="08:05",
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
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_param_raises(self):
        scenario = self._make_scenario(
            stop_2="Civic Center Hub",
            time="08:05",
            agent_answer="N/A",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_missing_time_param_raises(self):
        scenario = self._make_scenario(
            stop_1="Seaside Terrace",
            stop_2="Civic Center Hub",
            agent_answer="N/A",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")


if __name__ == "__main__":
    unittest.main()
