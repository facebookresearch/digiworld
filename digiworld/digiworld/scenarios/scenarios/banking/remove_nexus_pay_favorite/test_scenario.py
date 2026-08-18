# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for RemoveNexusPayFavoriteScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import RemoveNexusPayFavoriteScenario

ZELLE_SQL = [
    "CREATE TABLE zelle_contacts ("
    "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, "
    "contact_name TEXT, contact_email TEXT, contact_phone TEXT, "
    "is_enrolled INTEGER DEFAULT 0, is_favorite INTEGER DEFAULT 0, "
    "last_sent_amount REAL, last_sent_date TEXT, created_at TEXT)"
]


class TestRemoveNexusPayFavoriteScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in ZELLE_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(RemoveNexusPayFavoriteScenario, '__init__', lambda self, *a, **kw: None):
            scenario = RemoveNexusPayFavoriteScenario.__new__(RemoveNexusPayFavoriteScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
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

    def test_contact_unfavorited(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO zelle_contacts (user_id, contact_name, contact_email, is_favorite) "
                 "VALUES (?, ?, ?, ?)", (1, "Bob Jones", "bob@example.com", 0)),
            ])
            scenario = self._make_scenario(
                contact_name="Bob Jones",
                agent_answer="Removed from favorites",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["contact_not_favorite"])

    def test_contact_still_favorite_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [
                ("INSERT INTO zelle_contacts (user_id, contact_name, contact_email, is_favorite) "
                 "VALUES (?, ?, ?, ?)", (1, "Bob Jones", "bob@example.com", 1)),
            ])
            scenario = self._make_scenario(
                contact_name="Bob Jones",
                agent_answer="Removed from favorites",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["contact_not_favorite"])

    def test_contact_not_found_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(
                contact_name="Nonexistent",
                agent_answer="Done",
            )
            self._setup_state_manager(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["contact_not_favorite"])

    def test_missing_contact_name_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [])
            scenario = self._make_scenario(agent_answer="Done")
            self._setup_state_manager(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
