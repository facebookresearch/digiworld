# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.qwikshop.test_helpers  # noqa: F401
"""Tests for DeletePaymentMethodScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import DeletePaymentMethodScenario


class TestDeletePaymentMethodScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, table_sql, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in table_sql:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(DeletePaymentMethodScenario, '__init__', lambda self, *a, **kw: None):
            scenario = DeletePaymentMethodScenario.__new__(DeletePaymentMethodScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, initial_dir, final_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = initial_dir

        def compare_database_records(initial_path, current_path, query, params):
            initial = set(execute_query_in_path(query, params, initial_path))
            current = set(execute_query_in_path(query, params, current_path))
            new = current - initial
            return list(initial), list(current), list(new)
        scenario.compare_database_records = compare_database_records

    PAYMENT_SQL = [
        "CREATE TABLE payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "user_id INTEGER NOT NULL, type TEXT DEFAULT 'card', card_type TEXT, "
        "name_on_card TEXT NOT NULL, card_number TEXT NOT NULL, "
        "expiry_month TEXT, expiry_year TEXT, billing_address_id INTEGER, "
        "is_default INTEGER DEFAULT 0)"
    ]

    def test_pass_card_deleted(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.PAYMENT_SQL, [
                ("INSERT INTO payment_methods (user_id, name_on_card, card_number) "
                 "VALUES (?, ?, ?)", (1, "Alice", "4242-4242-4242-5678")),
            ])
            self._make_db(final_dir, self.PAYMENT_SQL, [])
            scenario = self._make_scenario(cardNumber="4242-4242-4242-5678")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_pass_card_deleted_normalized(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.PAYMENT_SQL, [
                ("INSERT INTO payment_methods (user_id, name_on_card, card_number) "
                 "VALUES (?, ?, ?)", (1, "Alice", "4242424242425678")),
            ])
            self._make_db(final_dir, self.PAYMENT_SQL, [])
            scenario = self._make_scenario(cardNumber="4242-4242-4242-5678")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_fail_card_still_present(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.PAYMENT_SQL, [
                ("INSERT INTO payment_methods (user_id, name_on_card, card_number) "
                 "VALUES (?, ?, ?)", (1, "Alice", "4242-4242-4242-5678")),
            ])
            self._make_db(final_dir, self.PAYMENT_SQL, [
                ("INSERT INTO payment_methods (user_id, name_on_card, card_number) "
                 "VALUES (?, ?, ?)", (1, "Alice", "4242-4242-4242-5678")),
            ])
            scenario = self._make_scenario(cardNumber="4242-4242-4242-5678")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_error_card_never_existed(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.PAYMENT_SQL, [])
            self._make_db(final_dir, self.PAYMENT_SQL, [])
            scenario = self._make_scenario(cardNumber="4242-4242-4242-9999")
            self._setup_state_manager(scenario, init_dir, final_dir)
            with self.assertRaises(ValueError):
                scenario._check_task_completion(final_dir)

    def test_pass_only_target_deleted_other_remains(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.PAYMENT_SQL, [
                ("INSERT INTO payment_methods (user_id, name_on_card, card_number) "
                 "VALUES (?, ?, ?)", (1, "Alice", "4242-4242-4242-5678")),
                ("INSERT INTO payment_methods (user_id, name_on_card, card_number) "
                 "VALUES (?, ?, ?)", (1, "Bob", "5555-5555-5555-1234")),
            ])
            self._make_db(final_dir, self.PAYMENT_SQL, [
                ("INSERT INTO payment_methods (user_id, name_on_card, card_number) "
                 "VALUES (?, ?, ?)", (1, "Bob", "5555-5555-5555-1234")),
            ])
            scenario = self._make_scenario(cardNumber="4242-4242-4242-5678")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
