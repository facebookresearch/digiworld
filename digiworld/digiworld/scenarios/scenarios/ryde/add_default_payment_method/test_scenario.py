# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddDefaultPaymentMethodScenario."""

import digiworld.scenarios.scenarios.ryde.test_helpers  # noqa: F401

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddDefaultPaymentMethodScenario

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


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_scenario(**kwargs):
    with patch.object(
        AddDefaultPaymentMethodScenario, "__init__", lambda self, *a, **kw: None
    ):
        scenario = AddDefaultPaymentMethodScenario.__new__(
            AddDefaultPaymentMethodScenario
        )
    scenario.current_user_id = kwargs.pop("current_user_id", 1)
    scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
    scenario._state_manager = MagicMock()
    scenario._execute_query_in_path = _execute_query_in_path
    scenario.agent_answer = kwargs.pop("agent_answer", "")
    for key, value in kwargs.items():
        setattr(scenario, key, value)
    return scenario


class TestAddDefaultPaymentMethodScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in TABLE_SQL:
            conn.execute(sql)
        for params in records:
            conn.execute(INSERT, params)
        conn.commit()
        conn.close()

    def test_pass_paypal_default(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [
                (1, "credit_card", "Visa", "4111111111111111", 1),
            ])
            self._make_db(final_dir, [
                (1, "credit_card", "Visa", "4111111111111111", 1),
                (1, "digital_wallet", "PayPal", "user@example.com", 1),
            ])
            scenario = _make_scenario(
                payment_type="paypal",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["payment_method_added"])
            self.assertTrue(checks["correct_type"])
            self.assertTrue(checks["is_default"])

    def test_pass_credit_card_default(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [
                (1, "digital_wallet", "PayPal", "user@example.com", 0),
            ])
            self._make_db(final_dir, [
                (1, "digital_wallet", "PayPal", "user@example.com", 0),
                (1, "credit_card", "Visa", "4111111111111111", 1),
            ])
            scenario = _make_scenario(
                payment_type="credit/debit card",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["payment_method_added"])
            self.assertTrue(checks["correct_type"])
            self.assertTrue(checks["is_default"])

    def test_fail_added_but_not_default(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [
                (1, "credit_card", "Visa", "4111111111111111", 1),
            ])
            self._make_db(final_dir, [
                (1, "credit_card", "Visa", "4111111111111111", 1),
                (1, "digital_wallet", "PayPal", "user@example.com", 0),
            ])
            scenario = _make_scenario(
                payment_type="paypal",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["payment_method_added"])
            self.assertTrue(checks["correct_type"])
            self.assertFalse(checks["is_default"])

    def test_fail_no_new_method(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [
                (1, "credit_card", "Visa", "4111111111111111", 1),
            ])
            self._make_db(final_dir, [
                (1, "credit_card", "Visa", "4111111111111111", 1),
            ])
            scenario = _make_scenario(
                payment_type="paypal",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["payment_method_added"])
            self.assertFalse(checks["correct_type"])
            self.assertFalse(checks["is_default"])

    def test_fail_unknown_type(self):
        with (
            tempfile.TemporaryDirectory() as init_dir,
            tempfile.TemporaryDirectory() as final_dir,
        ):
            self._make_db(init_dir, [])
            self._make_db(final_dir, [])
            scenario = _make_scenario(
                payment_type="bitcoin",
                initial_state_path=init_dir,
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)


if __name__ == "__main__":
    unittest.main()
