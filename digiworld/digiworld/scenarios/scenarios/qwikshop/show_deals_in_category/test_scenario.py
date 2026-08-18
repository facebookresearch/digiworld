# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ShowDealsInCategoryScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ShowDealsInCategoryScenario

TABLES_SQL = [
    "CREATE TABLE products ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, description TEXT, "
    "short_description TEXT, price REAL, discounted_price REAL, "
    "discount_percent INTEGER DEFAULT 0, rating REAL, review_count INTEGER, "
    "seller TEXT, category_id INTEGER, category_name TEXT, "
    "subcategory_id INTEGER, subcategory_name TEXT, "
    "in_stock INTEGER DEFAULT 1, stock_count INTEGER DEFAULT 50)"
]


class TestShowDealsInCategoryScenario(unittest.TestCase):
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
        with patch.object(ShowDealsInCategoryScenario, '__init__', lambda self, *a, **kw: None):
            scenario = ShowDealsInCategoryScenario.__new__(ShowDealsInCategoryScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
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

    def test_all_deals_reported(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Widget Pro", "Electronics", 25, 1)),
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (2, "Gadget Max", "Electronics", 30, 1)),
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (3, "Cable Basic", "Electronics", 5, 1)),
            ])
            scenario = self._make_scenario(
                category="Electronics",
                percentage="20",
                agent_answer="Found deals: Widget Pro at 25% off and Gadget Max at 30% off",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["deals_reported"])

    def test_missing_deal_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Widget Pro", "Electronics", 25, 1)),
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (2, "Gadget Max", "Electronics", 30, 1)),
            ])
            scenario = self._make_scenario(
                category="Electronics",
                percentage="20",
                agent_answer="Found deal: Widget Pro at 25% off",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["deals_reported"])

    def test_out_of_stock_excluded(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Widget Pro", "Electronics", 25, 1)),
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (2, "Gadget Max", "Electronics", 30, 0)),
            ])
            scenario = self._make_scenario(
                category="Electronics",
                percentage="20",
                agent_answer="Found deal: Widget Pro at 25% off",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["deals_reported"])

    def test_no_deals_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Widget Pro", "Electronics", 5, 1)),
            ])
            scenario = self._make_scenario(
                category="Electronics",
                percentage="20",
                agent_answer="No deals found",
            )
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_case_insensitive_category(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO products (id, name, category_name, discount_percent, in_stock) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Widget Pro", "electronics", 25, 1)),
            ])
            scenario = self._make_scenario(
                category="Electronics",
                percentage="20",
                agent_answer="Widget Pro is on sale",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["deals_reported"])


if __name__ == "__main__":
    unittest.main()
