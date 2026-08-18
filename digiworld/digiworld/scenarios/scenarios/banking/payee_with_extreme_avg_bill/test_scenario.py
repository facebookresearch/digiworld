# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for PayeeWithExtremeAvgBillScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import PayeeWithExtremeAvgBillScenario

BILLERS_SQL = [
    "CREATE TABLE billers ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, name TEXT, "
    "category TEXT, subcategory TEXT, description TEXT, phone TEXT, "
    "address TEXT, requires_account_number INTEGER DEFAULT 1, "
    "accepts_credit_card INTEGER DEFAULT 1, accepts_bank_account INTEGER DEFAULT 1, "
    "min_payment_amount REAL DEFAULT 1.0, average_bill_amount REAL, "
    "payment_processing_days INTEGER DEFAULT 1, is_active INTEGER DEFAULT 1, "
    "created_at TEXT)"
]


class TestPayeeWithExtremeAvgBillScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in BILLERS_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(PayeeWithExtremeAvgBillScenario, '__init__', lambda self, *a, **kw: None):
            scenario = PayeeWithExtremeAvgBillScenario.__new__(PayeeWithExtremeAvgBillScenario)
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

    def test_highest_avg_bill(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (code, name, category, average_bill_amount, is_active) VALUES (?, ?, ?, ?, ?)",
                 ("elec", "Electric Co", "utilities", 150.0, 1)),
                ("INSERT INTO billers (code, name, category, average_bill_amount, is_active) VALUES (?, ?, ?, ?, ?)",
                 ("gas", "Gas Provider", "utilities", 80.0, 1)),
                ("INSERT INTO billers (code, name, category, average_bill_amount, is_active) VALUES (?, ?, ?, ?, ?)",
                 ("water", "Water Utility", "utilities", 45.0, 1)),
            ])
            scenario = self._make_scenario(
                category="utilities", extreme="highest",
                agent_answer="Electric Co has the highest average bill",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_lowest_avg_bill(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (code, name, category, average_bill_amount, is_active) VALUES (?, ?, ?, ?, ?)",
                 ("elec", "Electric Co", "utilities", 150.0, 1)),
                ("INSERT INTO billers (code, name, category, average_bill_amount, is_active) VALUES (?, ?, ?, ?, ?)",
                 ("water", "Water Utility", "utilities", 45.0, 1)),
            ])
            scenario = self._make_scenario(
                category="utilities", extreme="lowest",
                agent_answer="Water Utility has the lowest average bill",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_payee_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO billers (code, name, category, average_bill_amount, is_active) VALUES (?, ?, ?, ?, ?)",
                 ("elec", "Electric Co", "utilities", 150.0, 1)),
                ("INSERT INTO billers (code, name, category, average_bill_amount, is_active) VALUES (?, ?, ?, ?, ?)",
                 ("water", "Water Utility", "utilities", 45.0, 1)),
            ])
            scenario = self._make_scenario(
                category="utilities", extreme="highest",
                agent_answer="Water Utility has the highest average bill",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_no_billers_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(
                category="utilities", extreme="highest",
                agent_answer="No payees found",
            )
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
