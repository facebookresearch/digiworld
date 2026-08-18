# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.auction.test_helpers  # noqa: F401  # mock heavy deps
"""Tests for DeleteListingScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import DeleteListingScenario


class TestDeleteListingScenario(unittest.TestCase):
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
        with patch.object(DeleteListingScenario, '__init__', lambda self, *a, **kw: None):
            scenario = DeleteListingScenario.__new__(DeleteListingScenario)
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

    ITEMS_SQL = [
        "CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, "
        "description TEXT, category_id INTEGER NOT NULL, seller_id INTEGER NOT NULL, "
        "price REAL NOT NULL, auction_flag INTEGER NOT NULL DEFAULT 0, current_bid REAL, "
        "starting_bid REAL, bid_increment REAL DEFAULT 1.0, end_time INTEGER, "
        "status TEXT DEFAULT 'active', expired INTEGER DEFAULT 0, quantity INTEGER DEFAULT 1, "
        "bid_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), "
        "updated_at TEXT DEFAULT (datetime('now')), sold_at TEXT)"
    ]

    def test_pass_listing_cancelled(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.ITEMS_SQL, [
                ("INSERT INTO items (title, category_id, seller_id, price, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("Old Camera", 1, 1, 200.0, "active")),
            ])
            self._make_db(final_dir, self.ITEMS_SQL, [
                ("INSERT INTO items (title, category_id, seller_id, price, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("Old Camera", 1, 1, 200.0, "cancelled")),
            ])
            scenario = self._make_scenario(title="Old Camera")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_fail_listing_still_active(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.ITEMS_SQL, [
                ("INSERT INTO items (title, category_id, seller_id, price, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("Old Camera", 1, 1, 200.0, "active")),
            ])
            self._make_db(final_dir, self.ITEMS_SQL, [
                ("INSERT INTO items (title, category_id, seller_id, price, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("Old Camera", 1, 1, 200.0, "active")),
            ])
            scenario = self._make_scenario(title="Old Camera")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_item_not_found_raises(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, self.ITEMS_SQL, [])
            scenario = self._make_scenario(title="Nonexistent Item")
            self._setup_state_manager(scenario, init_dir, final_dir)
            with self.assertRaises(ValueError):
                scenario._check_task_completion(final_dir)

    def test_pass_case_insensitive_title(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.ITEMS_SQL, [
                ("INSERT INTO items (title, category_id, seller_id, price, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("old camera", 1, 1, 200.0, "active")),
            ])
            self._make_db(final_dir, self.ITEMS_SQL, [
                ("INSERT INTO items (title, category_id, seller_id, price, status) "
                 "VALUES (?, ?, ?, ?, ?)", ("old camera", 1, 1, 200.0, "cancelled")),
            ])
            scenario = self._make_scenario(title="Old Camera")
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
