# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddItemToWishlistScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddItemToWishlistScenario

TABLES_SQL = [
    "CREATE TABLE products ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, "
    "short_description TEXT, price REAL, discounted_price REAL, "
    "discount_percent INTEGER DEFAULT 0, rating REAL, review_count INTEGER, "
    "seller TEXT, category_id INTEGER, category_name TEXT, "
    "subcategory_id INTEGER, subcategory_name TEXT, "
    "in_stock INTEGER DEFAULT 1, stock_count INTEGER DEFAULT 50)",
    "CREATE TABLE wishlists ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, product_id INTEGER)",
]


class TestAddItemToWishlistScenario(unittest.TestCase):
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
        with patch.object(AddItemToWishlistScenario, '__init__', lambda self, *a, **kw: None):
            scenario = AddItemToWishlistScenario.__new__(AddItemToWishlistScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, initial_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = initial_dir

    def test_item_added_successfully(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
                ("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", (1, 1)),
            ])
            scenario = self._make_scenario(item="Wireless Mouse")
            self._setup_state_manager(scenario, init_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_item_not_added_fails(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
            ])
            scenario = self._make_scenario(item="Wireless Mouse")
            self._setup_state_manager(scenario, init_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_already_in_wishlist_raises(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
                ("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", (1, 1)),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
                ("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", (1, 1)),
            ])
            scenario = self._make_scenario(item="Wireless Mouse")
            self._setup_state_manager(scenario, init_dir)
            with self.assertRaises(ValueError):
                scenario._check_task_completion(final_dir)

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "wireless mouse")),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "wireless mouse")),
                ("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", (1, 1)),
            ])
            scenario = self._make_scenario(item="Wireless Mouse")
            self._setup_state_manager(scenario, init_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_different_user_not_matched(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
            ])
            self._make_db(final_dir, [
                ("INSERT INTO products (id, name) VALUES (?, ?)", (1, "Wireless Mouse")),
                ("INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)", (2, 1)),
            ])
            scenario = self._make_scenario(item="Wireless Mouse")
            self._setup_state_manager(scenario, init_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
