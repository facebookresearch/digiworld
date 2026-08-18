# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SavedRouteDistanceScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import SavedRouteDistanceScenario


class TestSavedRouteDistanceScenario(unittest.TestCase):
    SAVED_ROUTES_DDL = (
        "CREATE TABLE saved_routes ("
        "id TEXT PRIMARY KEY, user_id INTEGER, name TEXT, "
        "origin_stop_id TEXT, destination_stop_id TEXT, "
        "preferred_mode TEXT, reminders_enabled INTEGER, "
        "departure_reminder_minutes INTEGER, "
        "created_at TEXT, updated_at TEXT)"
    )
    TRIP_OPTIONS_DDL = (
        "CREATE TABLE trip_options ("
        "id TEXT PRIMARY KEY, origin_stop_id TEXT, destination_stop_id TEXT, "
        "summary TEXT, departure_time TEXT, arrival_time TEXT, "
        "total_duration_minutes INTEGER, total_fare REAL, transfers INTEGER, "
        "walking_distance_meters INTEGER, tags TEXT, created_at TEXT)"
    )
    STOPS_DDL = (
        "CREATE TABLE stops ("
        "id TEXT PRIMARY KEY, name TEXT, area_id INTEGER, description TEXT, "
        "latitude REAL, longitude REAL, modes_served TEXT, facilities TEXT, "
        "amenities TEXT, accessibility TEXT)"
    )

    def _make_db(self, tmp_dir):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.SAVED_ROUTES_DDL)
        conn.execute(self.TRIP_OPTIONS_DDL)
        conn.execute(self.STOPS_DDL)
        return conn

    def _insert_route(self, conn, name="Sunset Express",
                      origin="stop-8", dest="stop-2"):
        conn.execute(
            "INSERT INTO saved_routes VALUES (?,?,?,?,?,?,?,?,?,?)",
            ("saved-1", 1, name, origin, dest, "train", 1, 15,
             "2024-01-01", "2024-01-01"),
        )

    def _insert_trip_option(self, conn, origin="stop-8", dest="stop-2",
                            walking_m=275):
        conn.execute(
            "INSERT INTO trip_options VALUES (?,?,?,?,?,?,?,?,?,?,?,?)",
            ("route-1", origin, dest, "Fastest route", "08:00", "08:37",
             37, 5.25, 0, walking_m, '["fastest"]', "2024-01-01"),
        )

    def _insert_stops(self, conn,
                      origin=("stop-8", "Seaside Terrace", 37.7749, -122.4194),
                      dest=("stop-2", "Civic Center Hub", 37.777377, -122.4194)):
        conn.execute(
            "INSERT INTO stops VALUES (?,?,?,?,?,?,?,?,?,?)",
            (origin[0], origin[1], 1, "", origin[2], origin[3], "[]", "[]", "[]", "[]"),
        )
        conn.execute(
            "INSERT INTO stops VALUES (?,?,?,?,?,?,?,?,?,?)",
            (dest[0], dest[1], 1, "", dest[2], dest[3], "[]", "[]", "[]", "[]"),
        )

    def _make_scenario(self, **kwargs):
        with patch.object(SavedRouteDistanceScenario, '__init__',
                          lambda self, *a, **kw: None):
            scenario = SavedRouteDistanceScenario.__new__(
                SavedRouteDistanceScenario
            )
        scenario.current_user_id = 1
        scenario.initial_state_path = kwargs.pop(
            'initial_state_path', '/tmp/test'
        )
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
        scenario.initial_state_path = state_dir

    def test_walking_km_matches(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn = self._make_db(tmp_dir)
            self._insert_route(conn)
            self._insert_trip_option(conn, walking_m=275)
            self._insert_stops(conn)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                route_title="Sunset Express",
                agent_answer="The distance is 0.275 km",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_walking_km_close_enough(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn = self._make_db(tmp_dir)
            self._insert_route(conn)
            self._insert_trip_option(conn, walking_m=275)
            self._insert_stops(conn)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                route_title="Sunset Express",
                agent_answer="About 0.3 km",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_walking_meters_does_not_match(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn = self._make_db(tmp_dir)
            self._insert_route(conn)
            self._insert_trip_option(conn, walking_m=275)
            self._insert_stops(conn)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                route_title="Sunset Express",
                agent_answer="The distance is 275 meters",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_wrong_distance_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn = self._make_db(tmp_dir)
            self._insert_route(conn)
            self._insert_trip_option(conn, walking_m=275)
            self._insert_stops(conn)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                route_title="Sunset Express",
                agent_answer="The distance is 99.9 km",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_larger_distance(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn = self._make_db(tmp_dir)
            self._insert_route(conn)
            self._insert_trip_option(conn, walking_m=380)
            self._insert_stops(
                conn,
                dest=("stop-2", "Civic Center Hub", 37.778323, -122.4194),
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                route_title="Sunset Express",
                agent_answer="The route is 0.38 km",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_missing_route_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn = self._make_db(tmp_dir)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                route_title="Nonexistent Route",
                agent_answer="No data",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_missing_coordinates_fail(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            conn = self._make_db(tmp_dir)
            self._insert_route(conn, origin="stop-99", dest="stop-100")
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                route_title="Sunset Express",
                agent_answer="Some distance",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_uses_verification_state_path(self):
        with tempfile.TemporaryDirectory() as initial_dir, tempfile.TemporaryDirectory() as final_dir:
            initial_conn = self._make_db(initial_dir)
            initial_conn.commit()
            initial_conn.close()

            final_conn = self._make_db(final_dir)
            self._insert_route(final_conn)
            self._insert_stops(final_conn)
            final_conn.commit()
            final_conn.close()

            scenario = self._make_scenario(
                route_title="Sunset Express",
                agent_answer="0.3 km",
                initial_state_path=initial_dir,
            )
            self._setup_state_manager(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["answer_matches"])

    def test_missing_param_raises(self):
        scenario = self._make_scenario()
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")


if __name__ == "__main__":
    unittest.main()
