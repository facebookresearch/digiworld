# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for NexusPayContactInfoScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import NexusPayContactInfoScenario


class TestNexusPayContactInfoScenario(unittest.TestCase):
    TABLES_SQL = [
        "CREATE TABLE zelle_contacts ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
        "contact_name TEXT, contact_email TEXT, contact_phone TEXT, "
        "is_enrolled INTEGER, is_favorite INTEGER)",
    ]

    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in self.TABLES_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(NexusPayContactInfoScenario, '__init__', lambda self, *a, **kw: None):
            scenario = NexusPayContactInfoScenario.__new__(NexusPayContactInfoScenario)
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

    INSERT_SQL = (
        "INSERT INTO zelle_contacts (user_id, contact_name, contact_email, contact_phone, "
        "is_enrolled, is_favorite) VALUES (?, ?, ?, ?, ?, ?)"
    )

    def test_email_correct(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "Jane Doe", "jane.doe@example.com", "+12025551234", 1, 0)),
            ])
            scenario = self._make_scenario(
                contact_name="Jane Doe",
                info_type="email address",
                agent_answer="Jane Doe's email is jane.doe@example.com",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_phone_correct(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "Jane Doe", "jane.doe@example.com", "+12025551234", 1, 0)),
            ])
            scenario = self._make_scenario(
                contact_name="Jane Doe",
                info_type="phone number",
                agent_answer="Jane Doe's phone number is +12025551234",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_email_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "Jane Doe", "jane.doe@example.com", "+12025551234", 1, 0)),
            ])
            scenario = self._make_scenario(
                contact_name="Jane Doe",
                info_type="email address",
                agent_answer="Jane's email is john.smith@example.com",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_contact_not_found_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(
                contact_name="Ghost User",
                info_type="email address",
                agent_answer="Not found",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_unknown_info_type_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "Jane Doe", "jane@example.com", "+1234", 1, 0)),
            ])
            scenario = self._make_scenario(
                contact_name="Jane Doe",
                info_type="home address",
                agent_answer="Some address",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_case_insensitive_name_lookup(self):
        """Contact lookup should be case-insensitive."""
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                (self.INSERT_SQL, (1, "jane doe", "jane.doe@example.com", "+12025551234", 1, 0)),
            ])
            scenario = self._make_scenario(
                contact_name="Jane Doe",
                info_type="email address",
                agent_answer="Jane Doe's email is jane.doe@example.com",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
