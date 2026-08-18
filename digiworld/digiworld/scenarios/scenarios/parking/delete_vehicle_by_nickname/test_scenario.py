# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for DeleteVehicleByNicknameScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import DeleteVehicleByNicknameScenario


class TestDeleteVehicleByNicknameScenario(unittest.TestCase):

    CREATE_VEHICLES = (
        "CREATE TABLE vehicles ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, nickname TEXT, "
        "make TEXT, model TEXT, color TEXT, year INTEGER, "
        "plate_number TEXT UNIQUE, vehicle_type_id INTEGER, "
        "is_default INTEGER, created_at TEXT, updated_at TEXT, metadata TEXT)"
    )

    def _make_db(self, tmp_dir, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(self.CREATE_VEHICLES)
        return conn, db_path

    def _make_scenario(self, **kwargs):
        with patch.object(DeleteVehicleByNicknameScenario, "__init__", lambda self, *a, **kw: None):
            scenario = DeleteVehicleByNicknameScenario.__new__(DeleteVehicleByNicknameScenario)
        scenario._state_manager = MagicMock()
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_execute(self, scenario, state_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = state_dir

    def test_vehicle_deleted_passes(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(nickname="Thunder")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["vehicle_deleted"])

    def test_vehicle_still_exists_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number) "
                "VALUES (1, 1, 'Thunder', 'Toyota', 'Camry', 'Blue', 2022, 'ABC123')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(nickname="Thunder")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["vehicle_deleted"])

    def test_case_insensitive(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number) "
                "VALUES (1, 1, 'Thunder', 'Toyota', 'Camry', 'Blue', 2022, 'ABC123')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(nickname="thunder")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["vehicle_deleted"])

    def test_different_user_vehicle_ignored(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number) "
                "VALUES (1, 2, 'Thunder', 'Toyota', 'Camry', 'Blue', 2022, 'ABC123')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(nickname="Thunder")
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["vehicle_deleted"])


if __name__ == "__main__":
    unittest.main()
