# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for StopScheduleExtremeArrivalScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from .scenario import StopScheduleExtremeArrivalScenario


class TestStopScheduleExtremeArrivalScenario(unittest.TestCase):
    STOPS_DDL = "CREATE TABLE stops (id TEXT PRIMARY KEY, name TEXT)"
    VEHICLES_DDL = (
        "CREATE TABLE vehicles ("
        "id TEXT PRIMARY KEY, line_id TEXT, vehicle_number TEXT, "
        "departure_time TEXT, direction TEXT, current_stop_id TEXT, "
        "current_stop_sequence INTEGER, status TEXT, "
        "schedule_data TEXT, created_at TEXT)"
    )

    def _make_db(self, tmp_dir, stops, vehicles):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.STOPS_DDL)
        conn.execute(self.VEHICLES_DDL)
        for s in stops:
            conn.execute("INSERT INTO stops VALUES (?, ?)", s)
        for v in vehicles:
            conn.execute(
                "INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", v
            )
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(
            StopScheduleExtremeArrivalScenario, "__init__",
            lambda self, *a, **kw: None,
        ):
            scenario = StopScheduleExtremeArrivalScenario.__new__(
                StopScheduleExtremeArrivalScenario
            )
        scenario.current_user_id = 1
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
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

    def _vehicle(self, vid, line_id, departure, direction, schedule, status="active"):
        return (
            vid, line_id, vid, departure, direction,
            None, 0, status, json.dumps(schedule), "2024-11-24T00:00:00Z",
        )

    def test_earliest_arrival(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            sched_a = [
                {"stopId": "stop-1", "arrivalTime": "05:20", "sequence": 1},
                {"stopId": "stop-2", "arrivalTime": "05:35", "sequence": 2},
            ]
            sched_b = [
                {"stopId": "stop-1", "arrivalTime": "06:00", "sequence": 1},
                {"stopId": "stop-2", "arrivalTime": "06:15", "sequence": 2},
            ]
            sched_c = [
                {"stopId": "stop-1", "arrivalTime": "22:30", "sequence": 1},
                {"stopId": "stop-2", "arrivalTime": "22:45", "sequence": 2},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange"), ("stop-2", "Civic Center Hub")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "05:20", "out", sched_a),
                    self._vehicle("v2", "line-t1", "06:00", "out", sched_b),
                    self._vehicle("v3", "line-s1", "22:30", "in", sched_c),
                ],
            )
            scenario = self._make_scenario(
                stop_name="Harbor Exchange",
                extreme_type="earliest",
                agent_answer="The earliest arrival is at 05:20",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_latest_arrival(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            sched_a = [
                {"stopId": "stop-1", "arrivalTime": "05:20", "sequence": 1},
            ]
            sched_b = [
                {"stopId": "stop-1", "arrivalTime": "23:10", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "05:20", "out", sched_a),
                    self._vehicle("v2", "line-t1", "23:10", "in", sched_b),
                ],
            )
            scenario = self._make_scenario(
                stop_name="Harbor Exchange",
                extreme_type="latest",
                agent_answer="The latest arrival at Harbor Exchange is 23:10",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_time_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            sched = [
                {"stopId": "stop-2", "arrivalTime": "07:00", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-2", "Civic Center Hub")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "07:00", "out", sched),
                ],
            )
            scenario = self._make_scenario(
                stop_name="Civic Center Hub",
                extreme_type="earliest",
                agent_answer="The earliest is 09:15",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_skips_completed_vehicles(self):
        """Only active vehicles should be considered."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            sched_completed = [
                {"stopId": "stop-1", "arrivalTime": "04:00", "sequence": 1},
            ]
            sched_active = [
                {"stopId": "stop-1", "arrivalTime": "08:00", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "04:00", "out", sched_completed, status="completed"),
                    self._vehicle("v2", "line-b1", "08:00", "out", sched_active),
                ],
            )
            scenario = self._make_scenario(
                stop_name="Harbor Exchange",
                extreme_type="earliest",
                agent_answer="The earliest arrival is 08:00",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_no_stop_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, stops=[], vehicles=[])
            scenario = self._make_scenario(
                stop_name="Nonexistent",
                extreme_type="earliest",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_no_vehicles_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange")],
                vehicles=[],
            )
            scenario = self._make_scenario(
                stop_name="Harbor Exchange",
                extreme_type="earliest",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_params_raises(self):
        scenario = self._make_scenario(agent_answer="something")
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_invalid_extreme_type_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange")],
                vehicles=[],
            )
            scenario = self._make_scenario(
                stop_name="Harbor Exchange",
                extreme_type="median",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_multiple_lines_at_same_stop(self):
        """Vehicles from different lines should all contribute arrivals."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            sched_bus = [
                {"stopId": "stop-6", "arrivalTime": "10:00", "sequence": 1},
            ]
            sched_train = [
                {"stopId": "stop-6", "arrivalTime": "23:50", "sequence": 1},
            ]
            sched_subway = [
                {"stopId": "stop-6", "arrivalTime": "06:30", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-6", "University Square")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "10:00", "out", sched_bus),
                    self._vehicle("v2", "line-t1", "23:50", "out", sched_train),
                    self._vehicle("v3", "line-s1", "06:30", "out", sched_subway),
                ],
            )
            scenario = self._make_scenario(
                stop_name="University Square",
                extreme_type="latest",
                agent_answer="The latest arrival is at 23:50",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
