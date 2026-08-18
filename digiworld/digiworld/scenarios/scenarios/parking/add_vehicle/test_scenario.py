# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddVehicleScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddVehicleScenario


class TestAddVehicleScenario(unittest.TestCase):

    CREATE_VEHICLES = (
        "CREATE TABLE vehicles ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, nickname TEXT, "
        "make TEXT, model TEXT, color TEXT, year INTEGER, "
        "plate_number TEXT UNIQUE, vehicle_type_id INTEGER, "
        "is_default INTEGER, created_at TEXT, updated_at TEXT, metadata TEXT)"
    )
    CREATE_VEHICLE_TYPES = (
        "CREATE TABLE vehicle_types ("
        "id INTEGER PRIMARY KEY, code TEXT, name TEXT, "
        "description TEXT, metadata TEXT, created_at TEXT)"
    )
    SEED_VEHICLE_TYPES = [
        (1, "sedan", "Sedan"), (2, "suv", "SUV"), (3, "truck", "Truck"),
        (4, "van", "Van"), (5, "ev", "Electric Vehicle"),
        (6, "motorcycle", "Motorcycle"), (7, "compact", "Compact"),
    ]

    def _make_db(self, tmp_dir, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(self.CREATE_VEHICLES)
        conn.execute(self.CREATE_VEHICLE_TYPES)
        for tid, code, name in self.SEED_VEHICLE_TYPES:
            conn.execute(
                "INSERT INTO vehicle_types (id, code, name) VALUES (?, ?, ?)",
                (tid, code, name),
            )
        conn.commit()
        return conn, db_path

    def _make_scenario(self, **kwargs):
        with patch.object(AddVehicleScenario, "__init__", lambda self, *a, **kw: None):
            scenario = AddVehicleScenario.__new__(AddVehicleScenario)
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

    def test_vehicle_added_passes(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number, vehicle_type_id) "
                "VALUES (1, 1, 'Thunder', 'Toyota', 'Camry', 'Blue', 2022, 'ABC123', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                license_plate="ABC123", make="Toyota", model="Camry",
                color="Blue", nickname="Thunder", vehicle_type="Sedan",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["vehicle_created"])
            self.assertTrue(checks["correct_make"])
            self.assertTrue(checks["correct_model"])
            self.assertTrue(checks["correct_color"])
            self.assertTrue(checks["correct_nickname"])
            self.assertTrue(checks["correct_vehicle_type"])

    def test_vehicle_not_found_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                license_plate="NOPLATE", make="Honda", model="Civic",
                color="Red", nickname="Ghost", vehicle_type="Sedan",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertFalse(checks["vehicle_created"])
            self.assertFalse(checks["correct_make"])
            self.assertFalse(checks["correct_model"])
            self.assertFalse(checks["correct_color"])
            self.assertFalse(checks["correct_nickname"])
            self.assertFalse(checks["correct_vehicle_type"])

    def test_wrong_make_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number, vehicle_type_id) "
                "VALUES (1, 1, 'Thunder', 'Honda', 'Camry', 'Blue', 2022, 'ABC123', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                license_plate="ABC123", make="Toyota", model="Camry",
                color="Blue", nickname="Thunder", vehicle_type="Sedan",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["vehicle_created"])
            self.assertFalse(checks["correct_make"])
            self.assertTrue(checks["correct_model"])
            self.assertTrue(checks["correct_color"])
            self.assertTrue(checks["correct_nickname"])
            self.assertTrue(checks["correct_vehicle_type"])

    def test_wrong_color_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number, vehicle_type_id) "
                "VALUES (1, 1, 'Thunder', 'Toyota', 'Camry', 'Red', 2022, 'ABC123', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                license_plate="ABC123", make="Toyota", model="Camry",
                color="Blue", nickname="Thunder", vehicle_type="Sedan",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["vehicle_created"])
            self.assertTrue(checks["correct_make"])
            self.assertTrue(checks["correct_model"])
            self.assertFalse(checks["correct_color"])
            self.assertTrue(checks["correct_nickname"])

    def test_wrong_vehicle_type_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number, vehicle_type_id) "
                "VALUES (1, 1, 'Thunder', 'Toyota', 'Camry', 'Blue', 2022, 'ABC123', 3)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                license_plate="ABC123", make="Toyota", model="Camry",
                color="Blue", nickname="Thunder", vehicle_type="Sedan",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["vehicle_created"])
            self.assertFalse(checks["correct_vehicle_type"])

    def test_case_insensitive_plate(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number, vehicle_type_id) "
                "VALUES (1, 1, 'Thunder', 'Toyota', 'Camry', 'Blue', 2022, 'ABC123', 1)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                license_plate="abc123", make="Toyota", model="Camry",
                color="Blue", nickname="Thunder", vehicle_type="Sedan",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["vehicle_created"])

    def test_case_insensitive_attributes(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute(
                "INSERT INTO vehicles (id, user_id, nickname, make, model, color, year, plate_number, vehicle_type_id) "
                "VALUES (1, 1, 'Thunder', 'Toyota', 'Camry', 'Blue', 2022, 'ABC123', 5)"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                license_plate="ABC123", make="toyota", model="camry",
                color="blue", nickname="thunder", vehicle_type="electric vehicle",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)

            self.assertTrue(checks["correct_make"])
            self.assertTrue(checks["correct_model"])
            self.assertTrue(checks["correct_color"])
            self.assertTrue(checks["correct_nickname"])
            self.assertTrue(checks["correct_vehicle_type"])


if __name__ == "__main__":
    unittest.main()
