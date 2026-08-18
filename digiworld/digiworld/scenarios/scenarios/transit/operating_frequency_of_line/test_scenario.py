# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for OperatingFrequencyOfLineScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import OperatingFrequencyOfLineScenario


class TestOperatingFrequencyOfLineScenario(unittest.TestCase):
    LINES_DDL = (
        "CREATE TABLE lines ("
        "id TEXT PRIMARY KEY, name TEXT, short_name TEXT, mode TEXT, "
        "color TEXT, operating_hours_start TEXT, operating_hours_end TEXT, "
        "frequency_minutes INTEGER, status TEXT)"
    )
    INSERT_SQL = (
        "INSERT INTO lines VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    def _make_db(self, tmp_dir, records):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.LINES_DDL)
        for rec in records:
            conn.execute(self.INSERT_SQL, rec)
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(OperatingFrequencyOfLineScenario, '__init__', lambda self, *a, **kw: None):
            scenario = OperatingFrequencyOfLineScenario.__new__(OperatingFrequencyOfLineScenario)
        scenario.current_user_id = 1
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

    def test_correct_frequency_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("line-b1", "City Connector", "B1", "bus", "#00F",
                 "05:00", "23:55", 20, "active"),
            ])
            scenario = self._make_scenario(
                line_name="City Connector",
                agent_answer="The City Connector runs every 20 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_frequency_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("line-b1", "City Connector", "B1", "bus", "#00F",
                 "05:00", "23:55", 20, "active"),
            ])
            scenario = self._make_scenario(
                line_name="City Connector",
                agent_answer="The bus comes every 15 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_train_frequency_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                ("line-t1", "Regional Express", "T1", "train", "#F00",
                 "00:00", "23:59", 120, "active"),
            ])
            scenario = self._make_scenario(
                line_name="Regional Express",
                agent_answer="The Regional Express has a frequency of 120 minutes",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_missing_line_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(
                line_name="Ghost Line",
                agent_answer="No data",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_line_name_param_raises(self):
        scenario = self._make_scenario(agent_answer="Some answer")
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")


if __name__ == "__main__":
    unittest.main()
