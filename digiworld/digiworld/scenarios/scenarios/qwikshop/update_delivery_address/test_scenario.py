# Copyright (c) Meta Platforms, Inc. and affiliates.
import digiworld.scenarios.scenarios.qwikshop.test_helpers  # noqa: F401

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import UpdateDeliveryAddressScenario

TABLE_SQL = [
    "CREATE TABLE addresses (id INTEGER PRIMARY KEY, user_id INTEGER, "
    "full_name TEXT, street TEXT, city TEXT, state TEXT, pincode TEXT, "
    "phone TEXT, country TEXT, delivery_instructions TEXT, "
    "is_default INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT)"
]


class TestUpdateDeliveryAddressScenario(unittest.TestCase):
    def _make_db(self, tmp_dir, records, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        for sql in TABLE_SQL:
            conn.execute(sql)
        for insert_sql, params in records:
            conn.execute(insert_sql, params)
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(UpdateDeliveryAddressScenario, '__init__', lambda self, *a, **kw: None):
            scenario = UpdateDeliveryAddressScenario.__new__(UpdateDeliveryAddressScenario)
        scenario.current_user_id = kwargs.pop('current_user_id', 1)
        scenario.initial_state_path = kwargs.pop('initial_state_path', '/tmp/test')
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_state_manager(self, scenario, final_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path

    INSERT = (
        "INSERT INTO addresses (user_id, full_name, street, city, state, "
        "pincode, phone, country, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    def test_pass_address_updated(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, [
                (self.INSERT, (1, "John Doe", "789 New Ave", "Denver", "CO",
                               "80201", "(303) 555-9876", "United States", 0)),
            ])
            scenario = self._make_scenario(
                street="123 Main St", city="Austin", state="TX",
                zip="73301", country="United States",
                street2="789 New Ave", city2="Denver", state2="CO",
                zip2="80201", country2="United States",
            )
            self._setup_state_manager(scenario, final_dir)
            self.assertTrue(scenario._check_task_completion(final_dir))

    def test_fail_old_address_still_present(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, [
                (self.INSERT, (1, "John Doe", "123 Main St", "Austin", "TX",
                               "73301", "(512) 555-1234", "United States", 0)),
            ])
            scenario = self._make_scenario(
                street="123 Main St", city="Austin", state="TX",
                zip="73301", country="United States",
                street2="789 New Ave", city2="Denver", state2="CO",
                zip2="80201", country2="United States",
            )
            self._setup_state_manager(scenario, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))

    def test_fail_no_addresses(self):
        with tempfile.TemporaryDirectory() as final_dir:
            self._make_db(final_dir, [])
            scenario = self._make_scenario(
                street="123 Main St", city="Austin", state="TX",
                zip="73301", country="United States",
                street2="789 New Ave", city2="Denver", state2="CO",
                zip2="80201", country2="United States",
            )
            self._setup_state_manager(scenario, final_dir)
            self.assertFalse(scenario._check_task_completion(final_dir))


if __name__ == "__main__":
    unittest.main()
