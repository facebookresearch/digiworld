# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.auction.test_helpers  # noqa: F401  # mock heavy deps
"""Tests for BuyIfBelowPriceScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import BuyIfBelowPriceScenario


class TestBuyIfBelowPriceScenario(unittest.TestCase):
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
        with patch.object(BuyIfBelowPriceScenario, '__init__', lambda self, *a, **kw: None):
            scenario = BuyIfBelowPriceScenario.__new__(BuyIfBelowPriceScenario)
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

    ITEMS_SQL = [
        "CREATE TABLE items (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, "
        "description TEXT, category_id INTEGER NOT NULL, seller_id INTEGER NOT NULL, "
        "price REAL NOT NULL, auction_flag INTEGER NOT NULL DEFAULT 0, current_bid REAL, "
        "starting_bid REAL, bid_increment REAL DEFAULT 1.0, end_time INTEGER, "
        "status TEXT DEFAULT 'active', expired INTEGER DEFAULT 0, quantity INTEGER DEFAULT 1, "
        "bid_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), "
        "updated_at TEXT DEFAULT (datetime('now')), sold_at TEXT)"
    ]
    TRANSACTIONS_SQL = [
        "CREATE TABLE transactions (id INTEGER PRIMARY KEY AUTOINCREMENT, "
        "session_id INTEGER, transaction_type TEXT NOT NULL, item_id INTEGER, "
        "user_id INTEGER NOT NULL, seller_id INTEGER, bid_id INTEGER, "
        "amount REAL NOT NULL, quantity INTEGER DEFAULT 1, "
        "status TEXT DEFAULT 'completed', payment_status TEXT DEFAULT 'pending', "
        "payment_method TEXT, payment_card_number TEXT, failure_reason TEXT, "
        "refund_amount REAL DEFAULT 0, refunded_at TEXT, "
        "transaction_date TEXT DEFAULT (datetime('now')), "
        "created_at TEXT DEFAULT (datetime('now')), metadata TEXT)"
    ]

    def test_pass_purchase_made(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.ITEMS_SQL + self.TRANSACTIONS_SQL, [
                ("INSERT INTO items (id, title, category_id, seller_id, price) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Blue Widget", 1, 2, 25.0)),
            ])
            self._make_db(final_dir, self.ITEMS_SQL + self.TRANSACTIONS_SQL, [
                ("INSERT INTO items (id, title, category_id, seller_id, price) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Blue Widget", 1, 2, 25.0)),
                ("INSERT INTO transactions (transaction_type, item_id, user_id, amount) "
                 "VALUES (?, ?, ?, ?)", ("purchase", 1, 1, 25.0)),
            ])
            scenario = self._make_scenario(title="Blue Widget", price=30.0)
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_fail_no_purchase(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.ITEMS_SQL + self.TRANSACTIONS_SQL, [
                ("INSERT INTO items (id, title, category_id, seller_id, price) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Blue Widget", 1, 2, 25.0)),
            ])
            self._make_db(final_dir, self.ITEMS_SQL + self.TRANSACTIONS_SQL, [
                ("INSERT INTO items (id, title, category_id, seller_id, price) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Blue Widget", 1, 2, 25.0)),
            ])
            scenario = self._make_scenario(title="Blue Widget", price=30.0)
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_fail_wrong_transaction_type(self):
        with tempfile.TemporaryDirectory() as init_dir, tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.ITEMS_SQL + self.TRANSACTIONS_SQL, [
                ("INSERT INTO items (id, title, category_id, seller_id, price) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Blue Widget", 1, 2, 25.0)),
            ])
            self._make_db(final_dir, self.ITEMS_SQL + self.TRANSACTIONS_SQL, [
                ("INSERT INTO items (id, title, category_id, seller_id, price) "
                 "VALUES (?, ?, ?, ?, ?)", (1, "Blue Widget", 1, 2, 25.0)),
                ("INSERT INTO transactions (transaction_type, item_id, user_id, amount) "
                 "VALUES (?, ?, ?, ?)", ("bid", 1, 1, 25.0)),
            ])
            scenario = self._make_scenario(title="Blue Widget", price=30.0)
            self._setup_state_manager(scenario, init_dir, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
