# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AddContactScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AddContactScenario

TABLES_SQL = [
    "CREATE TABLE users ("
    "id INTEGER PRIMARY KEY, email TEXT, password TEXT, pin TEXT, "
    "pin_attempts INTEGER, pin_locked_until TEXT, first_name TEXT, "
    "last_name TEXT, phone_number TEXT, created_at TEXT, updated_at TEXT, "
    "settings TEXT, status TEXT, kyc_verified INTEGER, "
    "daily_limit REAL, monthly_limit REAL)",
    "CREATE TABLE contacts ("
    "id INTEGER PRIMARY KEY, user_id INTEGER, contact_user_id INTEGER, "
    "nickname TEXT, favorite INTEGER, created_at TEXT, updated_at TEXT)",
]


def _create_db(directory, records, db_name=None):
    if db_name is None:
        db_name = os.path.basename(directory) + ".db"
    db_path = os.path.join(directory, db_name)
    conn = sqlite3.connect(db_path)
    for sql in TABLES_SQL:
        conn.execute(sql)
    for insert_sql, params in records:
        conn.execute(insert_sql, params)
    conn.commit()
    conn.close()
    return db_path


class TestAddContactScenario(unittest.TestCase):
    def _make_scenario(self, initial_state_path, **kwargs):
        with patch.object(AddContactScenario, '__init__', lambda self, *a, **kw: None):
            scenario = AddContactScenario.__new__(AddContactScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = initial_state_path
        from digiworld.scenarios.state_manager import StateManager
        scenario._state_manager = StateManager(scenario)
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_contact_added_passes(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            shared_user = (
                "INSERT INTO users (id, email, first_name, last_name, status) "
                "VALUES (?, ?, ?, ?, ?)",
                (10001, "alice.brown@example.com", "Alice", "Brown", "active"),
            )

            _create_db(initial_dir, [shared_user])
            _create_db(final_dir, [
                shared_user,
                (
                    "INSERT INTO contacts (id, user_id, contact_user_id, nickname, favorite) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (1, 1, 10001, "AliceB", 0),
                ),
            ])

            scenario = self._make_scenario(
                initial_dir, contact_name="Alice Brown"
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["contact_added"])

    def test_contact_not_added_fails(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            shared_user = (
                "INSERT INTO users (id, email, first_name, last_name, status) "
                "VALUES (?, ?, ?, ?, ?)",
                (10001, "alice.brown@example.com", "Alice", "Brown", "active"),
            )

            _create_db(initial_dir, [shared_user])
            _create_db(final_dir, [shared_user])

            scenario = self._make_scenario(
                initial_dir, contact_name="Alice Brown"
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["contact_added"])

    def test_first_name_only_match(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            shared_user = (
                "INSERT INTO users (id, email, first_name, last_name, status) "
                "VALUES (?, ?, ?, ?, ?)",
                (10001, "alice.brown@example.com", "Alice", "Brown", "active"),
            )

            _create_db(initial_dir, [shared_user])
            _create_db(final_dir, [
                shared_user,
                (
                    "INSERT INTO contacts (id, user_id, contact_user_id, nickname, favorite) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (1, 1, 10001, "AliceB", 0),
                ),
            ])

            scenario = self._make_scenario(
                initial_dir, contact_name="Alice"
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["contact_added"])

    def test_missing_contact_name_raises(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)
            _create_db(initial_dir, [])
            _create_db(final_dir, [])

            scenario = self._make_scenario(initial_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)

    def test_preexisting_contact_not_counted(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            initial_dir = os.path.join(tmpdir, "initial")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(initial_dir)
            os.makedirs(final_dir)

            shared_records = [
                (
                    "INSERT INTO users (id, email, first_name, last_name, status) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (10001, "alice.brown@example.com", "Alice", "Brown", "active"),
                ),
                (
                    "INSERT INTO contacts (id, user_id, contact_user_id, nickname, favorite) "
                    "VALUES (?, ?, ?, ?, ?)",
                    (1, 1, 10001, "AliceB", 0),
                ),
            ]

            _create_db(initial_dir, shared_records)
            _create_db(final_dir, shared_records)

            scenario = self._make_scenario(
                initial_dir, contact_name="Alice Brown"
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["contact_added"])


if __name__ == "__main__":
    unittest.main()
