# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for AlertAlternativesScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import AlertAlternativesScenario


class TestAlertAlternativesScenario(unittest.TestCase):
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
        with patch.object(AlertAlternativesScenario, '__init__', lambda self, *a, **kw: None):
            scenario = AlertAlternativesScenario.__new__(AlertAlternativesScenario)
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

    def _alert_with_alternatives(self):
        return (
            "alert-2", "high", "Nightly Maintenance on S1",
            "Scheduled maintenance on S1 line", "wrench",
            '["Use S2 Northbound Express as alternative route."]',
            "2024-11-24T22:00:00.000Z", "2024-11-25T05:00:00.000Z", 1,
        )

    def _alert_without_alternatives(self):
        return (
            "alert-1", "low", "Morning Fog Advisory",
            "Light fog expected", "fog", "[]",
            "2024-11-24T06:00:00.000Z", "2024-12-01T06:00:00.000Z", 1,
        )

    def test_correct_alternative_passes(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._alert_with_alternatives()])
            scenario = self._make_scenario(
                alert_title="Nightly Maintenance on S1",
                agent_answer="You can use S2 Northbound Express as alternative route.",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_alternative_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._alert_with_alternatives()])
            scenario = self._make_scenario(
                alert_title="Nightly Maintenance on S1",
                agent_answer="Take bus B3 instead.",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])

    def test_no_alternatives_raises(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            self._make_db(tmp_dir, [self._alert_without_alternatives()])
            scenario = self._make_scenario(
                alert_title="Morning Fog Advisory",
                agent_answer="No alternatives available",
            )
            self._setup_state_manager(scenario, tmp_dir)
            with self.assertRaises(ValueError):
                scenario._get_checks(tmp_dir)

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

    def test_multiple_alternatives_all_must_match(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            alert = (
                "alert-x", "high", "Multi Alt Alert",
                "Test alert", "icon",
                '["Take bus B1.", "Or use subway S2."]',
                "2024-11-24T22:00:00.000Z", "2024-11-25T05:00:00.000Z", 1,
            )
            self._make_db(tmp_dir, [alert])
            scenario = self._make_scenario(
                alert_title="Multi Alt Alert",
                agent_answer="You can take bus B1. Or use subway S2.",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertTrue(checks["answer_matches"])

    def test_partial_alternatives_fails(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            alert = (
                "alert-x", "high", "Multi Alt Alert",
                "Test alert", "icon",
                '["Take bus B1.", "Or use subway S2."]',
                "2024-11-24T22:00:00.000Z", "2024-11-25T05:00:00.000Z", 1,
            )
            self._make_db(tmp_dir, [alert])
            scenario = self._make_scenario(
                alert_title="Multi Alt Alert",
                agent_answer="You can take bus B1.",
            )
            self._setup_state_manager(scenario, tmp_dir)
            checks = scenario._get_checks(tmp_dir)
            self.assertFalse(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
