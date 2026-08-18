# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CityConnectorStopNumberScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import CityConnectorStopNumberScenario


class TestCityConnectorStopNumberScenario(unittest.TestCase):
    LINES_DDL = (
        "CREATE TABLE lines ("
        "id TEXT PRIMARY KEY, name TEXT, short_name TEXT, mode TEXT, "
        "color TEXT, operating_hours_start TEXT, operating_hours_end TEXT, "
        "frequency_minutes INTEGER, status TEXT)"
    )
    STOPS_DDL = (
        "CREATE TABLE stops ("
        "id TEXT PRIMARY KEY, name TEXT, area_id INTEGER, description TEXT, "
        "latitude REAL, longitude REAL, modes_served TEXT, facilities TEXT, "
        "amenities TEXT, accessibility TEXT)"
    )
    LINE_STOPS_DDL = (
        "CREATE TABLE line_stops ("
        "id INTEGER PRIMARY KEY, line_id TEXT, stop_id TEXT, sequence INTEGER)"
    )

    def _make_db(self, tmp_dir, lines, stops, line_stops):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.LINES_DDL)
        conn.execute(self.STOPS_DDL)
        conn.execute(self.LINE_STOPS_DDL)
        for rec in lines:
            conn.execute("INSERT INTO lines VALUES (?,?,?,?,?,?,?,?,?)", rec)
        for rec in stops:
            conn.execute(
                "INSERT INTO stops (id, name) VALUES (?, ?)", rec
            )
        for rec in line_stops:
            conn.execute(
                "INSERT INTO line_stops VALUES (?,?,?,?)", rec
            )
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(CityConnectorStopNumberScenario, '__init__', lambda self, *a, **kw: None):
            scenario = CityConnectorStopNumberScenario.__new__(CityConnectorStopNumberScenario)
        scenario.current_user_id = 1
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
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

    def _standard_data(self):
        lines = [
            ("line-b1", "City Connector", "B1", "bus", "#00F",
             "05:00", "23:55", 20, "active"),
        ]
        stops = [
            ("stop-1", "Harbor Exchange"),
            ("stop-2", "Civic Center Hub"),
            ("stop-3", "Market Street Gateway"),
            ("stop-4", "Skyline Commons"),
            ("stop-5", "Innovation Park"),
        ]
        line_stops = [
            (1, "line-b1", "stop-1", 1),
            (2, "line-b1", "stop-2", 2),
            (3, "line-b1", "stop-3", 3),
            (4, "line-b1", "stop-4", 4),
            (5, "line-b1", "stop-5", 5),
        ]
        return lines, stops, line_stops

    def test_correct_stop_number_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            lines, stops, line_stops = self._standard_data()
            self._make_db(tmp_dir, lines, stops, line_stops)
            scenario = self._make_scenario(
                stop_name="Market Street Gateway",
                agent_answer="Market Street Gateway is stop number 3",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_stop_number_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            lines, stops, line_stops = self._standard_data()
            self._make_db(tmp_dir, lines, stops, line_stops)
            scenario = self._make_scenario(
                stop_name="Market Street Gateway",
                agent_answer="Market Street Gateway is stop number 7",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_first_stop_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            lines, stops, line_stops = self._standard_data()
            self._make_db(tmp_dir, lines, stops, line_stops)
            scenario = self._make_scenario(
                stop_name="Harbor Exchange",
                agent_answer="Harbor Exchange is the 1st stop",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_stop_not_on_line_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            lines, stops, line_stops = self._standard_data()
            self._make_db(tmp_dir, lines, stops, line_stops)
            scenario = self._make_scenario(
                stop_name="Nonexistent Stop",
                agent_answer="No data",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_stop_name_param_raises(self):
        scenario = self._make_scenario(agent_answer="Some answer")
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")


if __name__ == "__main__":
    unittest.main()
