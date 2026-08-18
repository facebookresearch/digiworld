# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for LiveArrivalsDirectionFilterScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.transit.live_arrivals_direction_filter.scenario import (
    LiveArrivalsDirectionFilterScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(LiveArrivalsDirectionFilterScenario):
    def __init__(self):
        pass


def _make_rootstore(screen_name, route, selected_direction):
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
                "stopId": "stop-3",
                "stopName": "Market Street Gateway",
                "lineId": "line-1",
                "selectedDirection": selected_direction,
                "showFullSchedule": False,
            }
        },
    }


class TestLiveArrivalsDirectionFilter(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_all_direction_passes(self):
        rootstore = _make_rootstore(
            "StopSchedule", "/lines/line-1/stops/stop-3", "all"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.direction_filter = "All"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertTrue(checks["correct_direction"])

    def test_outbound_direction_passes(self):
        rootstore = _make_rootstore(
            "StopSchedule", "/lines/line-1/stops/stop-3", "out"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.direction_filter = "Outbound"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertTrue(checks["correct_direction"])

    def test_inbound_direction_passes(self):
        rootstore = _make_rootstore(
            "StopSchedule", "/lines/line-1/stops/stop-3", "in"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.direction_filter = "Inbound"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertTrue(checks["correct_direction"])

    def test_wrong_direction_fails(self):
        rootstore = _make_rootstore(
            "StopSchedule", "/lines/line-1/stops/stop-3", "out"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.direction_filter = "Inbound"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertFalse(checks["correct_direction"])

    def test_wrong_screen_fails(self):
        rootstore = _make_rootstore("Home", "/home", "all")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.direction_filter = "All"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_stop_schedule"])

    def test_missing_rootstore_fails(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.direction_filter = "Outbound"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_stop_schedule"])
        self.assertFalse(checks["correct_direction"])

    def test_missing_direction_filter_raises(self):
        rootstore = _make_rootstore(
            "StopSchedule", "/lines/line-1/stops/stop-3", "all"
        )
        _write_rootstore(self.state_dir, rootstore)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_invalid_direction_filter_raises(self):
        rootstore = _make_rootstore(
            "StopSchedule", "/lines/line-1/stops/stop-3", "all"
        )
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.direction_filter = "Eastbound"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_schedule_in_screen_name_passes(self):
        rootstore = _make_rootstore("Schedule", "/schedule", "in")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.direction_filter = "Inbound"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_stop_schedule"])
        self.assertTrue(checks["correct_direction"])


if __name__ == "__main__":
    unittest.main()
