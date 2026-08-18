# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AlertAffectedEntitiesScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AlertAffectedEntitiesScenario


class TestAlertAffectedEntitiesScenario(unittest.TestCase):
    ALERTS_DDL = (
        "CREATE TABLE service_alerts ("
        "id TEXT PRIMARY KEY, severity TEXT, title TEXT, description TEXT, "
        "icon TEXT, recommended_alternatives TEXT, created_at TEXT, "
        "expires_at TEXT, is_active INTEGER)"
    )
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
    ALERT_LINES_DDL = (
        "CREATE TABLE alert_lines ("
        "id INTEGER PRIMARY KEY, alert_id TEXT, line_id TEXT)"
    )
    ALERT_STOPS_DDL = (
        "CREATE TABLE alert_stops ("
        "id INTEGER PRIMARY KEY, alert_id TEXT, stop_id TEXT)"
    )

    def _make_db(self, tmp_dir, alerts, lines, stops, alert_lines, alert_stops):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.ALERTS_DDL)
        conn.execute(self.LINES_DDL)
        conn.execute(self.STOPS_DDL)
        conn.execute(self.ALERT_LINES_DDL)
        conn.execute(self.ALERT_STOPS_DDL)
        for rec in alerts:
            conn.execute(
                "INSERT INTO service_alerts VALUES (?,?,?,?,?,?,?,?,?)", rec
            )
        for rec in lines:
            conn.execute("INSERT INTO lines VALUES (?,?,?,?,?,?,?,?,?)", rec)
        for rec in stops:
            conn.execute("INSERT INTO stops (id, name) VALUES (?, ?)", rec)
        for rec in alert_lines:
            conn.execute("INSERT INTO alert_lines VALUES (?,?,?)", rec)
        for rec in alert_stops:
            conn.execute("INSERT INTO alert_stops VALUES (?,?,?)", rec)
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(AlertAffectedEntitiesScenario, '__init__', lambda self, *a, **kw: None):
            scenario = AlertAffectedEntitiesScenario.__new__(AlertAffectedEntitiesScenario)
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
        alerts = [
            ("alert-1", "low", "Morning Fog Advisory",
             "Light fog", "fog", "[]",
             "2024-11-24T06:00:00.000Z", "2024-12-01T06:00:00.000Z", 1),
        ]
        lines = [
            ("b1", "City Connector", "B1", "bus", "#00F",
             "05:00", "23:55", 20, "active"),
        ]
        stops = [
            ("1", "Harbor Exchange"),
            ("8", "Seaside Terrace"),
        ]
        alert_lines = [(1, "alert-1", "b1")]
        alert_stops = [(1, "alert-1", "1"), (2, "alert-1", "8")]
        return alerts, lines, stops, alert_lines, alert_stops

    def test_correct_lines_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data = self._standard_data()
            self._make_db(tmp_dir, *data)
            scenario = self._make_scenario(
                entity_type="lines",
                alert_title="Morning Fog Advisory",
                agent_answer="The affected line is City Connector",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_line_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data = self._standard_data()
            self._make_db(tmp_dir, *data)
            scenario = self._make_scenario(
                entity_type="lines",
                alert_title="Morning Fog Advisory",
                agent_answer="The affected line is Regional Express",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_correct_stops_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data = self._standard_data()
            self._make_db(tmp_dir, *data)
            scenario = self._make_scenario(
                entity_type="stops",
                alert_title="Morning Fog Advisory",
                agent_answer="Harbor Exchange and Seaside Terrace are affected",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_partial_stops_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data = self._standard_data()
            self._make_db(tmp_dir, *data)
            scenario = self._make_scenario(
                entity_type="stops",
                alert_title="Morning Fog Advisory",
                agent_answer="Harbor Exchange is affected",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_missing_alert_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [], [], [], [], [])
            scenario = self._make_scenario(
                entity_type="lines",
                alert_title="Nonexistent Alert",
                agent_answer="No data",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_uses_verification_state_path(self):
        with tempfile.TemporaryDirectory() as initial_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(initial_dir, [], [], [], [], [])
            data = self._standard_data()
            self._make_db(final_dir, *data)
            scenario = self._make_scenario(
                entity_type="lines",
                alert_title="Morning Fog Advisory",
                agent_answer="City Connector",
                initial_state_path=initial_dir,
            )
            self._setup_state_manager(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["answer_matches"])

    def test_missing_entity_type_raises(self):
        scenario = self._make_scenario(
            alert_title="Morning Fog Advisory",
            agent_answer="Some answer",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_missing_alert_title_raises(self):
        scenario = self._make_scenario(
            entity_type="lines",
            agent_answer="Some answer",
        )
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_unsupported_entity_type_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            data = self._standard_data()
            self._make_db(tmp_dir, *data)
            scenario = self._make_scenario(
                entity_type="routes",
                alert_title="Morning Fog Advisory",
                agent_answer="Some answer",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)


if __name__ == "__main__":
    unittest.main()
