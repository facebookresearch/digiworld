# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.eats.test_helpers  # noqa: F401
"""Tests for ReorderFromRestaurantScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from digiworld.scenarios.scenarios.eats.test_helpers import EATS_SCHEMA_SQL
from .scenario import ReorderFromRestaurantScenario


class TestReorderFromRestaurant(unittest.TestCase):

    def _make_db(self, directory, records=(), db_name="default.db"):
        db_path = os.path.join(directory, db_name)
        conn = sqlite3.connect(db_path)
        conn.executescript(EATS_SCHEMA_SQL)
        for sql, params in records:
            conn.execute(sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(ReorderFromRestaurantScenario, '__init__',
                          lambda self, *a, **kw: None):
            s = ReorderFromRestaurantScenario.__new__(
                ReorderFromRestaurantScenario)
        s.restaurant = kwargs.pop('restaurant', 'Test Restaurant')
        s.current_user_id = kwargs.pop('current_user_id', 1)
        s.initial_state_path = kwargs.pop('initial_state_path', '/tmp')
        s._state_manager = MagicMock()
        for k, v in kwargs.items():
            setattr(s, k, v)
        return s

    @staticmethod
    def _bind_helpers(scenario):
        def execute(query, params, state_path):
            for f in os.listdir(state_path):
                if f.endswith('.db'):
                    conn = sqlite3.connect(os.path.join(state_path, f))
                    rows = conn.execute(query, params).fetchall()
                    conn.close()
                    return rows
            raise ValueError(f"No .db file in {state_path}")

        def compare(s1, s2, query, params):
            initial = set(execute(query, params, s1))
            current = set(execute(query, params, s2))
            new = current - initial
            return list(initial), list(current), list(new)

        scenario._execute_query_in_path = execute
        scenario.compare_database_records = compare

    BASE_RECORDS = [
        ("INSERT INTO restaurants VALUES (90001,'Test Restaurant','','addr',0,0,'',4.5,2.99,10,8,'2025-01-01')", ()),
        ("INSERT INTO categories VALUES (90001,90001,'Menu',1)", ()),
        ("INSERT INTO menu_items VALUES (90001,90001,90001,'Pasta','',12.99,'',400,0,1,1)", ()),
        ("INSERT INTO orders VALUES (90001,1,90001,1,'delivered',12.99,'addr','credit_card','',1,'2025-01-01','2025-01-01')", ()),
        ("INSERT INTO order_items VALUES (90001,90001,90001,1,12.99,'')", ()),
    ]

    def test_successful_reorder(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.BASE_RECORDS)
            self._make_db(final_dir, self.BASE_RECORDS + [
                ("INSERT INTO orders VALUES (90002,1,90001,1,'pending',12.99,'addr','credit_card','',1,'2025-01-02','2025-01-02')", ()),
                ("INSERT INTO order_items VALUES (90002,90002,90001,1,12.99,'')", ()),
            ])

            s = self._make_scenario(initial_state_path=init_dir)
            self._bind_helpers(s)
            checks = s._get_checks(final_dir)
            self.assertTrue(checks["new_order_exists"])
            self.assertTrue(checks["items_match"])

    def test_no_new_order(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.BASE_RECORDS)
            self._make_db(final_dir, self.BASE_RECORDS)

            s = self._make_scenario(initial_state_path=init_dir)
            self._bind_helpers(s)
            checks = s._get_checks(final_dir)
            self.assertFalse(checks["new_order_exists"])
            self.assertFalse(checks["items_match"])

    def test_new_order_wrong_items(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.BASE_RECORDS + [
                ("INSERT INTO menu_items VALUES (90002,90001,90001,'Burger','',9.99,'',500,0,1,2)", ()),
            ])
            self._make_db(final_dir, self.BASE_RECORDS + [
                ("INSERT INTO menu_items VALUES (90002,90001,90001,'Burger','',9.99,'',500,0,1,2)", ()),
                ("INSERT INTO orders VALUES (90002,1,90001,1,'pending',9.99,'addr','credit_card','',1,'2025-01-02','2025-01-02')", ()),
                ("INSERT INTO order_items VALUES (90002,90002,90002,1,9.99,'')", ()),
            ])

            s = self._make_scenario(initial_state_path=init_dir)
            self._bind_helpers(s)
            checks = s._get_checks(final_dir)
            self.assertTrue(checks["new_order_exists"])
            self.assertFalse(checks["items_match"])

    def test_handles_set_result_from_compare_database_records(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, self.BASE_RECORDS)
            self._make_db(final_dir, self.BASE_RECORDS + [
                ("INSERT INTO orders VALUES (90002,1,90001,1,'pending',12.99,'addr','credit_card','',1,'2025-01-02','2025-01-02')", ()),
                ("INSERT INTO order_items VALUES (90002,90002,90001,1,12.99,'')", ()),
            ])

            s = self._make_scenario(initial_state_path=init_dir)
            self._bind_helpers(s)
            original_compare = s.compare_database_records

            def compare_as_sets(s1, s2, query, params):
                initial, current, new = original_compare(s1, s2, query, params)
                return set(initial), set(current), set(new)

            s.compare_database_records = compare_as_sets

            checks = s._get_checks(final_dir)
            self.assertTrue(checks["new_order_exists"])
            self.assertTrue(checks["items_match"])

    def test_restaurant_not_found(self):
        with tempfile.TemporaryDirectory() as init_dir:
            self._make_db(init_dir)
            s = self._make_scenario(restaurant='Nonexistent',
                                    initial_state_path=init_dir)
            self._bind_helpers(s)
            with self.assertRaises(ValueError):
                s._get_checks("/unused")


if __name__ == "__main__":
    unittest.main()
