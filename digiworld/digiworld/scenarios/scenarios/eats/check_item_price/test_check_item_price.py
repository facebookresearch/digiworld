# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.eats.test_helpers  # noqa: F401
"""Tests for CheckItemPriceScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from digiworld.scenarios.scenarios.eats.test_helpers import EATS_SCHEMA_SQL
from .scenario import CheckItemPriceScenario


class TestCheckItemPrice(unittest.TestCase):

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
        with patch.object(CheckItemPriceScenario, '__init__',
                          lambda self, *a, **kw: None):
            s = CheckItemPriceScenario.__new__(CheckItemPriceScenario)
        s.restaurant_item = kwargs.pop('restaurant_item', 'Pasta')
        s.restaurant = kwargs.pop('restaurant', 'Test Bistro')
        s.agent_answer = kwargs.pop('agent_answer', '')
        s.initial_state_path = kwargs.pop('initial_state_path', '/tmp')
        s._state_manager = MagicMock()
        for k, v in kwargs.items():
            setattr(s, k, v)
        return s

    @staticmethod
    def _bind_execute(scenario):
        def execute(query, params, state_path):
            for f in os.listdir(state_path):
                if f.endswith('.db'):
                    conn = sqlite3.connect(os.path.join(state_path, f))
                    rows = conn.execute(query, params).fetchall()
                    conn.close()
                    return rows
            raise ValueError(f"No .db file in {state_path}")
        scenario._execute_query_in_path = execute

    SEED_RECORDS = [
        ("INSERT INTO restaurants VALUES (90001,'Test Bistro','','addr',0,0,'',4.5,2.99,10,8,'2025-01-01')", ()),
        ("INSERT INTO categories VALUES (90001,90001,'Menu',1)", ()),
        ("INSERT INTO menu_items VALUES (90001,90001,90001,'Pasta','Delicious',12.99,'',400,0,1,1)", ()),
    ]

    def test_correct_price(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.SEED_RECORDS)
            s = self._make_scenario(agent_answer="$12.99",
                                    initial_state_path=d)
            self._bind_execute(s)
            checks = s._get_checks("/unused")
            self.assertTrue(checks["answer_matches"])

    def test_wrong_price(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.SEED_RECORDS)
            s = self._make_scenario(agent_answer="$15.99",
                                    initial_state_path=d)
            self._bind_execute(s)
            checks = s._get_checks("/unused")
            self.assertFalse(checks["answer_matches"])

    def test_price_in_sentence(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.SEED_RECORDS)
            s = self._make_scenario(
                agent_answer="The price for Pasta is $12.99",
                initial_state_path=d)
            self._bind_execute(s)
            checks = s._get_checks("/unused")
            self.assertTrue(checks["answer_matches"])

    def test_no_number_in_answer(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, self.SEED_RECORDS)
            s = self._make_scenario(agent_answer="I don't know",
                                    initial_state_path=d)
            self._bind_execute(s)
            checks = s._get_checks("/unused")
            self.assertFalse(checks["answer_matches"])

    def test_missing_menu_item_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO restaurants VALUES (90001,'Test Bistro','','addr',0,0,'',4.5,2.99,10,8,'2025-01-01')", ()),
            ])
            s = self._make_scenario(agent_answer="$12.99",
                                    initial_state_path=d)
            self._bind_execute(s)
            with self.assertRaises(ValueError):
                s._get_checks("/unused")


if __name__ == "__main__":
    unittest.main()
