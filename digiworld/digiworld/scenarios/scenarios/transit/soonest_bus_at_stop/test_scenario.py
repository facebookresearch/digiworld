# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SoonestBusAtStopScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

from .scenario import SoonestBusAtStopScenario


class TestSoonestBusAtStopScenario(unittest.TestCase):
    STOPS_DDL = "CREATE TABLE stops (id TEXT PRIMARY KEY, name TEXT)"
    LINES_DDL = (
        "CREATE TABLE lines ("
        "id TEXT PRIMARY KEY, name TEXT, short_name TEXT, mode TEXT, "
        "color TEXT, operating_hours_start TEXT, operating_hours_end TEXT, "
        "frequency_minutes INTEGER, status TEXT)"
    )
    VEHICLES_DDL = (
        "CREATE TABLE vehicles ("
        "id TEXT PRIMARY KEY, line_id TEXT, vehicle_number TEXT, "
        "departure_time TEXT, direction TEXT, current_stop_id TEXT, "
        "current_stop_sequence INTEGER, status TEXT, "
        "schedule_data TEXT, created_at TEXT)"
    )

    def _make_db(self, tmp_dir, stops, lines, vehicles):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.STOPS_DDL)
        conn.execute(self.LINES_DDL)
        conn.execute(self.VEHICLES_DDL)
        for s in stops:
            conn.execute("INSERT INTO stops VALUES (?, ?)", s)
        for l in lines:
            conn.execute(
                "INSERT INTO lines VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", l
            )
        for v in vehicles:
            conn.execute(
                "INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", v
            )
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(
            SoonestBusAtStopScenario, "__init__", lambda self, *a, **kw: None
        ):
            scenario = SoonestBusAtStopScenario.__new__(
                SoonestBusAtStopScenario
            )
        scenario.current_user_id = 1
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp/test")
        scenario.reference_time = kwargs.pop("reference_time", "08:00")
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

    def test_correct_soonest_outbound(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            schedule_early = [
                {"stopId": "stop-3", "arrivalTime": "07:40", "sequence": 1},
                {"stopId": "stop-4", "arrivalTime": "07:50", "sequence": 2},
            ]
            schedule_mid = [
                {"stopId": "stop-3", "arrivalTime": "08:20", "sequence": 1},
                {"stopId": "stop-4", "arrivalTime": "08:30", "sequence": 2},
            ]
            schedule_late = [
                {"stopId": "stop-3", "arrivalTime": "09:00", "sequence": 1},
                {"stopId": "stop-4", "arrivalTime": "09:10", "sequence": 2},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-3", "Market Street Gateway"), ("stop-4", "Skyline Commons")],
                lines=[("line-b1", "City Connector", "B1", "bus", "#00F", "05:00", "23:55", 20, "active")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "07:40", "out", schedule_early),
                    self._vehicle("v2", "line-b1", "08:20", "out", schedule_mid),
                    self._vehicle("v3", "line-b1", "09:00", "out", schedule_late),
                ],
            )
            scenario = self._make_scenario(
                direction="outbound",
                stop_name="Market Street Gateway",
                line_name="City Connector",
                agent_answer="The soonest outbound bus arrives at 08:20",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_correct_soonest_inbound(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            schedule = [
                {"stopId": "stop-5", "arrivalTime": "08:45", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-5", "Innovation Park")],
                lines=[("line-b1", "City Connector", "B1", "bus", "#00F", "05:00", "23:55", 20, "active")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "08:45", "in", schedule),
                ],
            )
            scenario = self._make_scenario(
                direction="inbound",
                stop_name="Innovation Park",
                line_name="City Connector",
                agent_answer="The next inbound bus is at 08:45",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_time_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            schedule = [
                {"stopId": "stop-3", "arrivalTime": "08:20", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-3", "Market Street Gateway")],
                lines=[("line-b1", "City Connector", "B1", "bus", "#00F", "05:00", "23:55", 20, "active")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "08:20", "out", schedule),
                ],
            )
            scenario = self._make_scenario(
                direction="outbound",
                stop_name="Market Street Gateway",
                line_name="City Connector",
                agent_answer="The soonest bus is at 10:30",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_filters_past_arrivals(self):
        """Arrivals before the current reference time should be excluded."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            schedule_early = [
                {"stopId": "stop-1", "arrivalTime": "06:30", "sequence": 1},
            ]
            schedule_after = [
                {"stopId": "stop-1", "arrivalTime": "08:10", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange")],
                lines=[("line-b1", "City Connector", "B1", "bus", "#00F", "05:00", "23:55", 20, "active")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "06:30", "out", schedule_early),
                    self._vehicle("v2", "line-b1", "08:10", "out", schedule_after),
                ],
            )
            scenario = self._make_scenario(
                direction="outbound",
                stop_name="Harbor Exchange",
                line_name="City Connector",
                agent_answer="The soonest bus is at 08:10",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_uses_current_reference_time(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            schedule_early = [
                {"stopId": "stop-1", "arrivalTime": "09:15", "sequence": 1},
            ]
            schedule_after = [
                {"stopId": "stop-1", "arrivalTime": "09:40", "sequence": 1},
            ]
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange")],
                lines=[("line-b1", "City Connector", "B1", "bus", "#00F", "05:00", "23:55", 20, "active")],
                vehicles=[
                    self._vehicle("v1", "line-b1", "09:15", "out", schedule_early),
                    self._vehicle("v2", "line-b1", "09:40", "out", schedule_after),
                ],
            )
            scenario = self._make_scenario(
                direction="outbound",
                stop_name="Harbor Exchange",
                line_name="City Connector",
                agent_answer="The soonest bus is at 09:40",
                reference_time="09:30",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_no_stop_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, stops=[], lines=[], vehicles=[])
            scenario = self._make_scenario(
                direction="outbound",
                stop_name="Nonexistent",
                line_name="City Connector",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_no_line_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(
                tmp_dir,
                stops=[("stop-1", "Harbor Exchange")],
                lines=[],
                vehicles=[],
            )
            scenario = self._make_scenario(
                direction="outbound",
                stop_name="Harbor Exchange",
                line_name="Ghost Line",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_params_raises(self):
        scenario = self._make_scenario(agent_answer="something")
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_invalid_direction_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, stops=[], lines=[], vehicles=[])
            scenario = self._make_scenario(
                direction="northbound",
                stop_name="Harbor Exchange",
                line_name="City Connector",
                agent_answer="N/A",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
