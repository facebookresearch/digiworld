# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddNewPayeeScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddNewPayeeScenario

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


class TestAddNewPayeeScenario(unittest.TestCase):
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
        with patch.object(AddNewPayeeScenario, '__init__', lambda self, *a, **kw: None):
            scenario = AddNewPayeeScenario.__new__(AddNewPayeeScenario)
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

    def test_payee_created_successfully(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            self._make_db(initial, [])
            self._make_db(final, [
                ("INSERT INTO billers (code, name, category, phone) VALUES (?, ?, ?, ?)",
                 ("newpay", "Pacific Gas & Electric", "utilities", "(555) 123-4567")),
            ])
            scenario = self._make_scenario(
                payee_name="Pacific Gas & Electric",
                category="utilities",
                phone="(555) 123-4567",
                initial_state_path=initial,
                agent_answer="Payee added",
            )
            self._setup_state_manager(scenario, final)
            checks = scenario._get_checks(final)
            self.assertTrue(checks["payee_created"])
            self.assertTrue(checks["category_matches"])
            self.assertTrue(checks["phone_matches"])

    def test_payee_not_found_fails(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            self._make_db(initial, [])
            self._make_db(final, [])
            scenario = self._make_scenario(
                payee_name="Pacific Gas & Electric",
                initial_state_path=initial,
                agent_answer="Payee added",
            )
            self._setup_state_manager(scenario, final)
            checks = scenario._get_checks(final)
            self.assertFalse(checks["payee_created"])

    def test_false_positive_pre_existing(self):
        """If the payee already exists in initial state, it should not count as created."""
        records = [
            ("INSERT INTO billers (code, name, category) VALUES (?, ?, ?)",
             ("exist", "Pacific Gas & Electric", "utilities")),
        ]
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            self._make_db(initial, records)
            self._make_db(final, records)
            scenario = self._make_scenario(
                payee_name="Pacific Gas & Electric",
                initial_state_path=initial,
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, final)
            checks = scenario._get_checks(final)
            self.assertFalse(checks["payee_created"])

    def test_category_mismatch(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            self._make_db(initial, [])
            self._make_db(final, [
                ("INSERT INTO billers (code, name, category) VALUES (?, ?, ?)",
                 ("newpay", "Pacific Gas & Electric", "insurance")),
            ])
            scenario = self._make_scenario(
                payee_name="Pacific Gas & Electric",
                category="utilities",
                initial_state_path=initial,
                agent_answer="Payee added",
            )
            self._setup_state_manager(scenario, final)
            checks = scenario._get_checks(final)
            self.assertTrue(checks["payee_created"])
            self.assertFalse(checks["category_matches"])

    def test_phone_mismatch(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            self._make_db(initial, [])
            self._make_db(final, [
                ("INSERT INTO billers (code, name, category, phone) VALUES (?, ?, ?, ?)",
                 ("newpay", "Pacific Gas & Electric", "utilities", "(555) 000-0000")),
            ])
            scenario = self._make_scenario(
                payee_name="Pacific Gas & Electric",
                phone="(555) 123-4567",
                initial_state_path=initial,
                agent_answer="Payee added",
            )
            self._setup_state_manager(scenario, final)
            checks = scenario._get_checks(final)
            self.assertTrue(checks["payee_created"])
            self.assertFalse(checks["phone_matches"])

    def test_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            self._make_db(initial, [])
            self._make_db(final, [
                ("INSERT INTO billers (code, name, category) VALUES (?, ?, ?)",
                 ("newpay", "pacific gas & electric", "utilities")),
            ])
            scenario = self._make_scenario(
                payee_name="Pacific Gas & Electric",
                initial_state_path=initial,
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, final)
            checks = scenario._get_checks(final)
            self.assertTrue(checks["payee_created"])

    def test_missing_payee_name_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(agent_answer="Done")
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
