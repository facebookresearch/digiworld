# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddPaymentMethodScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddPaymentMethodScenario

TABLE_SQL = (
    "CREATE TABLE user_payment_methods ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
    "user_id INTEGER, type TEXT, provider TEXT, "
    "account_number TEXT, is_default INTEGER DEFAULT 0)"
)


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


def _make_db(tmp_dir, rows):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.execute(TABLE_SQL)
    for sql, params in rows:
        conn.execute(sql, params)
    conn.commit()
    conn.close()


class TestAddPaymentMethod(unittest.TestCase):

    def _make_scenario(self, payment_type, initial_dir):
        with patch.object(AddPaymentMethodScenario, "__init__", lambda self, *a, **kw: None):
            scenario = AddPaymentMethodScenario.__new__(AddPaymentMethodScenario)
        scenario.current_user_id = 1
        scenario.payment_type = payment_type
        scenario.initial_state_path = initial_dir
        scenario.agent_answer = ""
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = _execute_query_in_path
        return scenario

    def test_pass_add_paypal(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Visa")),
            ])
            _make_db(final_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Visa")),
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "digital_wallet", "PayPal")),
            ])
            scenario = self._make_scenario("PayPal", init_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["payment_method_added"])
            self.assertTrue(checks["correct_type"])

    def test_pass_add_credit_card(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "digital_wallet", "PayPal")),
            ])
            _make_db(final_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "digital_wallet", "PayPal")),
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Mastercard")),
            ])
            scenario = self._make_scenario("Credit/Debit Card", init_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["payment_method_added"])
            self.assertTrue(checks["correct_type"])

    def test_fail_no_new_method(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Visa")),
            ])
            _make_db(final_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Visa")),
            ])
            scenario = self._make_scenario("PayPal", init_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["payment_method_added"])
            self.assertFalse(checks["correct_type"])

    def test_fail_wrong_type(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Visa")),
            ])
            _make_db(final_dir, [
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Visa")),
                ("INSERT INTO user_payment_methods (user_id, type, provider) VALUES (?, ?, ?)",
                 (1, "credit_card", "Mastercard")),
            ])
            scenario = self._make_scenario("PayPal", init_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["payment_method_added"])
            self.assertFalse(checks["correct_type"])

    def test_fail_unknown_type(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            _make_db(init_dir, [])
            _make_db(final_dir, [])
            scenario = self._make_scenario("Bitcoin", init_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)


if __name__ == "__main__":
    unittest.main()
