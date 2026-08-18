# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SaveTripRouteScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import SaveTripRouteScenario


class TestSaveTripRouteScenario(unittest.TestCase):
    SAVED_ROUTES_DDL = (
        "CREATE TABLE saved_routes ("
        "id TEXT PRIMARY KEY, user_id INTEGER, name TEXT, "
        "origin_stop_id TEXT, destination_stop_id TEXT, "
        "preferred_mode TEXT, reminders_enabled INTEGER, "
        "departure_reminder_minutes INTEGER, "
        "created_at TEXT, updated_at TEXT)"
    )
    INSERT_SQL = (
        "INSERT INTO saved_routes "
        "(id, user_id, name, origin_stop_id, destination_stop_id, "
        "preferred_mode, reminders_enabled, departure_reminder_minutes, "
        "created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    def _make_db(self, tmp_dir, records):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.SAVED_ROUTES_DDL)
        for rec in records:
            conn.execute(self.INSERT_SQL, rec)
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(SaveTripRouteScenario, '__init__', lambda self, *a, **kw: None):
            scenario = SaveTripRouteScenario.__new__(SaveTripRouteScenario)
        scenario.current_user_id = 1
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        scenario.agent_answer = ""
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

    def _sample_route(self, name="Sunset Express"):
        return (
            "saved-sunset-express", 1, name,
            "stop-8", "stop-2", "train", 1, 15,
            "2024-11-24T10:00:00.000Z", "2024-11-24T10:00:00.000Z",
        )

    def test_route_saved_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._sample_route("Sunset Express")])
            scenario = self._make_scenario(route_title="Sunset Express")
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["route_saved"])

    def test_route_not_saved_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(route_title="Sunset Express")
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["route_saved"])

    def test_partial_title_match(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._sample_route("My Sunset Express Route")])
            scenario = self._make_scenario(route_title="Sunset Express")
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["route_saved"])

    def test_different_route_name_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._sample_route("Morning Commuter")])
            scenario = self._make_scenario(route_title="Sunset Express")
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["route_saved"])

    def test_missing_param_raises(self):
        scenario = self._make_scenario()
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")


if __name__ == "__main__":
    unittest.main()
