# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ServiceAlertsSeverityFilterScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.transit.service_alerts_severity_filter.scenario import (
    ServiceAlertsSeverityFilterScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ServiceAlertsSeverityFilterScenario):
    def __init__(self):
        pass


def _make_rootstore(screen_name, route, selected_severity):
    return {
        "sessionStore": {
            "session": {
                "data": {
                    "screenName": screen_name,
                    "route": route,
                }
            }
        },
        "alertsStore": {
            "alertsState": {
                "selectedSeverity": selected_severity,
            }
        },
    }


class TestServiceAlertsSeverityFilter(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_all_severity_passes(self):
        rootstore = _make_rootstore("Alerts", "/alerts", "all")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "All"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_alerts_page"])
        self.assertTrue(checks["correct_filter"])

    def test_high_severity_passes(self):
        rootstore = _make_rootstore("Alerts", "/alerts", "high")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "High"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_alerts_page"])
        self.assertTrue(checks["correct_filter"])

    def test_medium_severity_passes(self):
        rootstore = _make_rootstore("Alerts", "/alerts", "medium")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "Medium"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_alerts_page"])
        self.assertTrue(checks["correct_filter"])

    def test_low_severity_passes(self):
        rootstore = _make_rootstore("Alerts", "/alerts", "low")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "Low"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_alerts_page"])
        self.assertTrue(checks["correct_filter"])

    def test_wrong_severity_fails(self):
        rootstore = _make_rootstore("Alerts", "/alerts", "low")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "High"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_alerts_page"])
        self.assertFalse(checks["correct_filter"])

    def test_wrong_screen_fails(self):
        rootstore = _make_rootstore("Home", "/home", "all")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "All"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_alerts_page"])

    def test_missing_rootstore_fails(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.severity_filter = "High"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_alerts_page"])
        self.assertFalse(checks["correct_filter"])

    def test_missing_severity_filter_raises(self):
        rootstore = _make_rootstore("Alerts", "/alerts", "all")
        _write_rootstore(self.state_dir, rootstore)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_invalid_severity_filter_raises(self):
        rootstore = _make_rootstore("Alerts", "/alerts", "all")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "Critical"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_alert_in_screen_name_passes(self):
        rootstore = _make_rootstore("ServiceAlerts", "/service-alerts", "high")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.severity_filter = "High"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_alerts_page"])
        self.assertTrue(checks["correct_filter"])


if __name__ == "__main__":
    unittest.main()
