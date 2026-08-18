# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for BookRideWithCarTypeAndPaymentScenario."""

import digiworld.scenarios.scenarios.ryde.test_helpers  # noqa: F401

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import BookRideWithCarTypeAndPaymentScenario

TABLE_SQL = [
    "CREATE TABLE user_payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "user_id INTEGER, type TEXT, provider TEXT, account_number TEXT, "
    "is_default INTEGER DEFAULT 0)"
]

INSERT = (
    "INSERT INTO user_payment_methods "
    "(user_id, type, provider, account_number, is_default) "
    "VALUES (?, ?, ?, ?, ?)"
)

_SAMPLE_ROOTSTORE = {
    "sessionStore": {"session": {"id": "default", "data": {}}},
    "userStore": {"currentUser": {"id": 1}, "authToken": "token"},
    "rideStore": {
        "currentRide": {
            "source": "408, East 13th Street, Manhattan, USA",
            "destination": "1177, Broadway, NoMad, Manhattan, USA",
            "status": "booked",
        },
        "currentRideOption": "Economy",
        "currentPaymentMethod": "cash",
    },
    "uiStore": {},
}


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_scenario(**kwargs):
    with patch.object(
        BookRideWithCarTypeAndPaymentScenario,
        "__init__",
        lambda self, *a, **kw: None,
    ):
        scenario = BookRideWithCarTypeAndPaymentScenario.__new__(
            BookRideWithCarTypeAndPaymentScenario
        )
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = kwargs.pop("agent_answer", "")
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


def _write_rootstore(tmp_dir, rootstore):
    with open(os.path.join(tmp_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class TestBookRideWithCarTypeAndPaymentScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in TABLE_SQL:
            conn.execute(sql)
        for params in records:
            conn.execute(INSERT, params)
        conn.commit()
        conn.close()

    def test_pass_cash_payment(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._make_db(state_dir, [])
            _write_rootstore(state_dir, _SAMPLE_ROOTSTORE)
            scenario = _make_scenario(
                origin="408, East 13th Street, Manhattan, USA",
                destination="1177, Broadway, NoMad, Manhattan, USA",
                car_type="Economy",
                payment_method="cash",
            )
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["ride_booked"])
            self.assertTrue(checks["origin_matches"])
            self.assertTrue(checks["destination_matches"])
            self.assertTrue(checks["car_type_matches"])
            self.assertTrue(checks["payment_matches"])

    def test_pass_visa_payment(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._make_db(state_dir, [
                (1, "credit_card", "Visa", "4111111111111111", 1),
            ])
            rootstore = {
                **_SAMPLE_ROOTSTORE,
                "rideStore": {
                    **_SAMPLE_ROOTSTORE["rideStore"],
                    "currentPaymentMethod": "1",
                },
            }
            _write_rootstore(state_dir, rootstore)
            scenario = _make_scenario(
                origin="408, East 13th Street, Manhattan, USA",
                destination="1177, Broadway, NoMad, Manhattan, USA",
                car_type="Economy",
                payment_method="Visa",
            )
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["ride_booked"])
            self.assertTrue(checks["payment_matches"])

    def test_fail_wrong_car_type(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._make_db(state_dir, [])
            _write_rootstore(state_dir, _SAMPLE_ROOTSTORE)
            scenario = _make_scenario(
                origin="408, East 13th Street, Manhattan, USA",
                destination="1177, Broadway, NoMad, Manhattan, USA",
                car_type="Premium",
                payment_method="cash",
            )
            checks = scenario._get_checks(state_dir)
            self.assertTrue(checks["ride_booked"])
            self.assertFalse(checks["car_type_matches"])

    def test_fail_wrong_payment(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._make_db(state_dir, [])
            _write_rootstore(state_dir, _SAMPLE_ROOTSTORE)
            scenario = _make_scenario(
                origin="408, East 13th Street, Manhattan, USA",
                destination="1177, Broadway, NoMad, Manhattan, USA",
                car_type="Economy",
                payment_method="Visa",
            )
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["payment_matches"])

    def test_fail_no_ride(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._make_db(state_dir, [])
            rootstore = {
                **_SAMPLE_ROOTSTORE,
                "rideStore": {
                    **_SAMPLE_ROOTSTORE["rideStore"],
                    "currentRide": None,
                },
            }
            _write_rootstore(state_dir, rootstore)
            scenario = _make_scenario(
                origin="408, East 13th Street, Manhattan, USA",
                destination="1177, Broadway, NoMad, Manhattan, USA",
                car_type="Economy",
                payment_method="cash",
            )
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["ride_booked"])

    def test_fail_wrong_origin(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._make_db(state_dir, [])
            _write_rootstore(state_dir, _SAMPLE_ROOTSTORE)
            scenario = _make_scenario(
                origin="999 Wrong Street, Brooklyn, USA",
                destination="1177, Broadway, NoMad, Manhattan, USA",
                car_type="Economy",
                payment_method="cash",
            )
            checks = scenario._get_checks(state_dir)
            self.assertFalse(checks["origin_matches"])

    def test_fail_no_rootstore(self):
        with tempfile.TemporaryDirectory() as state_dir:
            self._make_db(state_dir, [])
            scenario = _make_scenario(
                origin="408, East 13th Street, Manhattan, USA",
                destination="1177, Broadway, NoMad, Manhattan, USA",
                car_type="Economy",
                payment_method="cash",
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(state_dir)


if __name__ == "__main__":
    unittest.main()
