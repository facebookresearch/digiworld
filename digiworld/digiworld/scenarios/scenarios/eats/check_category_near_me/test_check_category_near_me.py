# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.eats.test_helpers  # noqa: F401
"""Tests for CheckCategoryNearMeScenario."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from digiworld.scenarios.scenarios.eats.test_helpers import EATS_SCHEMA_SQL
from .scenario import CheckCategoryNearMeScenario


class TestCheckCategoryNearMe(unittest.TestCase):

    def _make_db(self, directory, records=(), db_name="default.db"):
        db_path = os.path.join(directory, db_name)
        conn = sqlite3.connect(db_path)
        conn.executescript(EATS_SCHEMA_SQL)
        for sql, params in records:
            conn.execute(sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _write_rootstore(self, directory, data):
        path = os.path.join(directory, "rootstore.json")
        with open(path, "w") as f:
            json.dump(data, f)

    def _make_scenario(self, **kwargs):
        with patch.object(CheckCategoryNearMeScenario, '__init__',
                          lambda self, *a, **kw: None):
            s = CheckCategoryNearMeScenario.__new__(
                CheckCategoryNearMeScenario)
        s.category = kwargs.pop('category', 'Sushi Rolls')
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

    def _rootstore_with_category(self, category_id):
        return {
            "sessionStore": {
                "sessions": [{
                    "data": {
                        "screenName": "CategoryScreen",
                        "route": f"/screens/category/{category_id}",
                        "sessionData": {
                            "formData": {"categoryId": category_id}
                        }
                    }
                }]
            }
        }

    # ---- happy path ----

    def test_on_correct_category_screen(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO restaurants VALUES (90001,'R','','addr',0,0,'',4.5,2.99,10,8,'2025-01-01')", ()),
                ("INSERT INTO categories VALUES (90001,90001,'Sushi Rolls',1)", ()),
            ])
            self._write_rootstore(final_dir, self._rootstore_with_category(90001))

            s = self._make_scenario(category='Sushi Rolls',
                                    initial_state_path=init_dir)
            self._bind_execute(s)
            checks = s._get_checks(final_dir)
            self.assertTrue(checks["on_category_screen"])

    # ---- wrong screen name ----

    def test_wrong_screen(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO restaurants VALUES (90001,'R','','addr',0,0,'',4.5,2.99,10,8,'2025-01-01')", ()),
                ("INSERT INTO categories VALUES (90001,90001,'Sushi Rolls',1)", ()),
            ])
            rootstore = {
                "sessionStore": {
                    "sessions": [{
                        "data": {
                            "screenName": "HomeScreen",
                            "route": "/screens/home",
                            "sessionData": {"formData": {}}
                        }
                    }]
                }
            }
            self._write_rootstore(final_dir, rootstore)

            s = self._make_scenario(category='Sushi Rolls',
                                    initial_state_path=init_dir)
            self._bind_execute(s)
            checks = s._get_checks(final_dir)
            self.assertFalse(checks["on_category_screen"])

    # ---- wrong categoryId ----

    def test_wrong_category_id(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO restaurants VALUES (90001,'R','','addr',0,0,'',4.5,2.99,10,8,'2025-01-01')", ()),
                ("INSERT INTO categories VALUES (90001,90001,'Sushi Rolls',1)", ()),
            ])
            self._write_rootstore(final_dir, self._rootstore_with_category(99999))

            s = self._make_scenario(category='Sushi Rolls',
                                    initial_state_path=init_dir)
            self._bind_execute(s)
            checks = s._get_checks(final_dir)
            self.assertFalse(checks["on_category_screen"])

    # ---- no rootstore file ----

    def test_missing_rootstore(self):
        with tempfile.TemporaryDirectory() as init_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            self._make_db(init_dir, [
                ("INSERT INTO restaurants VALUES (90001,'R','','addr',0,0,'',4.5,2.99,10,8,'2025-01-01')", ()),
                ("INSERT INTO categories VALUES (90001,90001,'Sushi Rolls',1)", ()),
            ])
            s = self._make_scenario(category='Sushi Rolls',
                                    initial_state_path=init_dir)
            self._bind_execute(s)
            checks = s._get_checks(final_dir)
            self.assertFalse(checks["on_category_screen"])

    # ---- category not found in DB ----

    def test_category_not_in_db(self):
        with tempfile.TemporaryDirectory() as init_dir:
            self._make_db(init_dir)
            s = self._make_scenario(category='Nonexistent',
                                    initial_state_path=init_dir)
            self._bind_execute(s)
            with self.assertRaises(ValueError):
                s._get_checks("/unused")


if __name__ == "__main__":
    unittest.main()
