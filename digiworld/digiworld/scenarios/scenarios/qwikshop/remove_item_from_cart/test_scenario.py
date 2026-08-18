# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.qwikshop.test_helpers  # noqa: F401
"""Tests for RemoveItemFromCartScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import RemoveItemFromCartScenario


class TestRemoveItemFromCartScenario(unittest.TestCase):
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
        with patch.object(RemoveItemFromCartScenario, '__init__', lambda self, *a, **kw: None):
            scenario = RemoveItemFromCartScenario.__new__(RemoveItemFromCartScenario)
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

    CART_SQL = [
        "CREATE TABLE cart_items (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "cart_id INTEGER, user_id INTEGER NOT NULL, product_id INTEGER, "
        "product_name TEXT NOT NULL, product_image TEXT, short_description TEXT, "
        "seller TEXT, quantity INTEGER NOT NULL, price REAL, discounted_price REAL, "
        "total REAL, in_stock INTEGER DEFAULT 1)"
    ]

    def test_pass_partial_removal(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 5, 49.99)),
            ])
            self._make_db(final_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 3, 49.99)),
            ])
            scenario = self._make_scenario(quantity="2", item="Bluetooth Speaker")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_pass_full_removal(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 2, 49.99)),
            ])
            self._make_db(final_dir, self.CART_SQL, [])
            scenario = self._make_scenario(quantity="2", item="Bluetooth Speaker")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_pass_remove_more_than_available(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 2, 49.99)),
            ])
            self._make_db(final_dir, self.CART_SQL, [])
            scenario = self._make_scenario(quantity="3", item="Bluetooth Speaker")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_fail_quantity_not_reduced_enough(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 5, 49.99)),
            ])
            self._make_db(final_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 4, 49.99)),
            ])
            scenario = self._make_scenario(quantity="2", item="Bluetooth Speaker")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_fail_item_still_present_when_should_be_gone(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 2, 49.99)),
            ])
            self._make_db(final_dir, self.CART_SQL, [
                ("INSERT INTO cart_items (user_id, product_name, quantity, price) "
                 "VALUES (?, ?, ?, ?)", (1, "Bluetooth Speaker", 1, 49.99)),
            ])
            scenario = self._make_scenario(quantity="2", item="Bluetooth Speaker")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_error_item_not_in_initial_cart(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.CART_SQL, [])
            self._make_db(final_dir, self.CART_SQL, [])
            scenario = self._make_scenario(quantity="1", item="Nonexistent Item")
            self._setup_state_manager(scenario, init_dir, final_dir)
            with self.assertRaises(ValueError):
                scenario._check_task_completion(final_dir)


if __name__ == "__main__":
    unittest.main()
