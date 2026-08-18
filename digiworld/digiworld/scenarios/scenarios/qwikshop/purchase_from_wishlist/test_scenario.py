# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PurchaseFromWishlistScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import PurchaseFromWishlistScenario

TABLES_SQL = [
    "CREATE TABLE order_items ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, order_id INTEGER, product_id INTEGER, "
    "product_name TEXT, quantity INTEGER, price REAL, discounted_price REAL, "
    "total REAL)",
]


class TestPurchaseFromWishlistScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in TABLES_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(PurchaseFromWishlistScenario, '__init__', lambda self, *a, **kw: None):
            scenario = PurchaseFromWishlistScenario.__new__(PurchaseFromWishlistScenario)
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

    def test_purchase_completed(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [])
            self._make_db(final_dir, [
                ("INSERT INTO order_items (order_id, product_name, quantity, price, total) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Wireless Headphones", 1, 79.99, 79.99)),
            ])
            scenario = self._make_scenario(item="Wireless Headphones")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_no_purchase_fails(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [])
            self._make_db(final_dir, [])
            scenario = self._make_scenario(item="Wireless Headphones")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_wrong_product_fails(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [])
            self._make_db(final_dir, [
                ("INSERT INTO order_items (order_id, product_name, quantity, price, total) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Different Product", 1, 49.99, 49.99)),
            ])
            scenario = self._make_scenario(item="Wireless Headphones")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_pre_existing_order_not_counted(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO order_items (order_id, product_name, quantity, price, total) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Wireless Headphones", 1, 79.99, 79.99)),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO order_items (order_id, product_name, quantity, price, total) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Wireless Headphones", 1, 79.99, 79.99)),
            ])
            scenario = self._make_scenario(item="Wireless Headphones")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [])
            self._make_db(final_dir, [
                ("INSERT INTO order_items (order_id, product_name, quantity, price, total) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "wireless headphones", 1, 79.99, 79.99)),
            ])
            scenario = self._make_scenario(item="Wireless Headphones")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
