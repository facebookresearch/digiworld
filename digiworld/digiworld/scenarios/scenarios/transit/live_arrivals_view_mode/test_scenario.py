# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for LiveArrivalsViewModeScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.transit.live_arrivals_view_mode.scenario import (
    LiveArrivalsViewModeScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(LiveArrivalsViewModeScenario):
    def __init__(self):
        pass


def _make_rootstore(screen_name, route, show_full_schedule):
    return {
        "sessionStore": {
            "session": {
                "data": {
                    "screenName": screen_name,
                    "route": route,
                }
            }
        },
        "stopScheduleStore": {
            "stopScheduleState": {
                "stopId": "stop-1",
                "stopName": "Harbor Exchange",
                "lineId": "line-1",
                "selectedDirection": "all",
                "showFullSchedule": show_full_schedule,
            }
        },
    }


class TestLiveArrivalsViewMode(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_full_day_on_schedule_passes(self):
        rootstore = _make_rootstore("StopSchedule", "/lines/line-1/stops/stop-1", True)
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.view_mode = "Full Day"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertTrue(checks["correct_view_mode"])

    def test_upcoming_on_schedule_passes(self):
        rootstore = _make_rootstore("StopSchedule", "/lines/line-1/stops/stop-1", False)
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.view_mode = "Upcoming"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertTrue(checks["correct_view_mode"])

    def test_wrong_view_mode_fails(self):
        rootstore = _make_rootstore("StopSchedule", "/lines/line-1/stops/stop-1", False)
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.view_mode = "Full Day"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertFalse(checks["correct_view_mode"])

    def test_wrong_screen_fails(self):
        rootstore = _make_rootstore("Home", "/home", True)
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.view_mode = "Full Day"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_stop_schedule"])

    def test_missing_rootstore_fails(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.view_mode = "Full Day"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_stop_schedule"])
        self.assertFalse(checks["correct_view_mode"])

    def test_missing_view_mode_raises(self):
        rootstore = _make_rootstore("StopSchedule", "/lines/line-1/stops/stop-1", True)
        _write_rootstore(self.state_dir, rootstore)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_invalid_view_mode_raises(self):
        rootstore = _make_rootstore("StopSchedule", "/lines/line-1/stops/stop-1", True)
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.view_mode = "Weekly"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_schedule_in_screen_name_passes(self):
        rootstore = _make_rootstore("Schedule", "/schedule", True)
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.view_mode = "Full Day"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertTrue(checks["correct_view_mode"])


if __name__ == "__main__":
    unittest.main()
