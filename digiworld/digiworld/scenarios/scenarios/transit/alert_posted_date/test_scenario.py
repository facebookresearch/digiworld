# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AlertPostedDateScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AlertPostedDateScenario


class TestAlertPostedDateScenario(unittest.TestCase):
    ALERTS_DDL = (
        "CREATE TABLE service_alerts ("
        "id TEXT PRIMARY KEY, severity TEXT, title TEXT, description TEXT, "
        "icon TEXT, recommended_alternatives TEXT, created_at TEXT, "
        "expires_at TEXT, is_active INTEGER)"
    )
    INSERT_SQL = (
        "INSERT INTO service_alerts "
        "(id, severity, title, description, icon, recommended_alternatives, "
        "created_at, expires_at, is_active) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    )

    def _make_db(self, tmp_dir, records):
        db_path = os.path.join(tmp_dir, "default.db")
        conn = sqlite3.connect(db_path)
        conn.execute(self.ALERTS_DDL)
        for rec in records:
            conn.execute(self.INSERT_SQL, rec)
        conn.commit()
        conn.close()

    def _make_scenario(self, **kwargs):
        with patch.object(AlertPostedDateScenario, '__init__', lambda self, *a, **kw: None):
            scenario = AlertPostedDateScenario.__new__(AlertPostedDateScenario)
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

    def _sample_alert(self, created_at="2024-11-24T06:00:00.000Z"):
        return (
            "alert-1", "low", "Morning Fog Advisory",
            "Light fog expected", "fog", "[]",
            created_at, "2024-12-01T06:00:00.000Z", 1,
        )

    def test_correct_date_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._sample_alert()])
            scenario = self._make_scenario(
                alert_title="Morning Fog Advisory",
                agent_answer="The alert was posted on November 24, 2024",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_date_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._sample_alert()])
            scenario = self._make_scenario(
                alert_title="Morning Fog Advisory",
                agent_answer="The alert was posted on January 1, 2025",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_missing_alert_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [])
            scenario = self._make_scenario(
                alert_title="Nonexistent Alert",
                agent_answer="No data",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

    def test_missing_param_raises(self):
        scenario = self._make_scenario(agent_answer="Some answer")
        with self.assertRaises(ValueError):
            scenario._get_checks("/tmp/test")

    def test_iso_date_without_z(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [
                self._sample_alert(created_at="2024-11-24T06:00:00+00:00")
            ])
            scenario = self._make_scenario(
                alert_title="Morning Fog Advisory",
                agent_answer="It was posted on 2024-11-24",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
