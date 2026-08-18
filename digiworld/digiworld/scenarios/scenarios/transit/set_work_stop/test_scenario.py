# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SetWorkStopScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.transit.set_work_stop.scenario import (
    SetWorkStopScenario,
)


def _create_state(state_dir, work_stop_id="stop-2", user_id=1):
    os.makedirs(state_dir, exist_ok=True)
    state_name = os.path.basename(state_dir)
    db_path = os.path.join(state_dir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute(
        "CREATE TABLE stops ("
        "id TEXT PRIMARY KEY, name TEXT, area_id INTEGER)"
    )
    stops = [
        ("stop-1", "Harbor Exchange", 1),
        ("stop-2", "Civic Center Hub", 1),
        ("stop-3", "Market Street Gateway", 2),
        ("stop-4", "Skyline Commons", 2),
        ("stop-5", "Innovation Park", 3),
        ("stop-6", "University Square", 3),
        ("stop-7", "Aurora Heights", 4),
        ("stop-8", "Seaside Terrace", 4),
    ]
    cur.executemany("INSERT INTO stops VALUES (?,?,?)", stops)
    cur.execute(
        "CREATE TABLE user_preferences ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, "
        "home_stop_id TEXT, work_stop_id TEXT, preferred_modes TEXT, "
        "language TEXT DEFAULT 'en', notification_service_alerts INTEGER DEFAULT 1, "
        "notification_departure_reminders INTEGER DEFAULT 1, "
        "notification_arrivals INTEGER DEFAULT 0, updated_at TEXT)"
    )
    cur.execute(
        "INSERT INTO user_preferences (user_id, home_stop_id, work_stop_id, preferred_modes) "
        "VALUES (?, 'stop-8', ?, '[\"subway\",\"train\"]')",
        (user_id, work_stop_id),
    )
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id, "email": "test@test.com"}},
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(SetWorkStopScenario):
    def __init__(self):
        pass


class TestSetWorkStop(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.agent_answer = ""
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_correct_work_stop_passes(self):
        _create_state(self.state_dir, work_stop_id="stop-5")
        self.scenario.stop_name = "Innovation Park"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["work_stop_matches"])

    def test_wrong_work_stop_fails(self):
        _create_state(self.state_dir, work_stop_id="stop-2")
        self.scenario.stop_name = "Innovation Park"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["work_stop_matches"])

    def test_case_insensitive_match(self):
        _create_state(self.state_dir, work_stop_id="stop-4")
        self.scenario.stop_name = "skyline commons"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["work_stop_matches"])

    def test_no_preferences_raises(self):
        os.makedirs(self.state_dir, exist_ok=True)
        state_name = os.path.basename(self.state_dir)
        db_path = os.path.join(self.state_dir, f"{state_name}.db")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE stops (id TEXT PRIMARY KEY, name TEXT, area_id INTEGER)"
        )
        cur.execute(
            "CREATE TABLE user_preferences ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, "
            "home_stop_id TEXT, work_stop_id TEXT, preferred_modes TEXT, "
            "language TEXT DEFAULT 'en', notification_service_alerts INTEGER DEFAULT 1, "
            "notification_departure_reminders INTEGER DEFAULT 1, "
            "notification_arrivals INTEGER DEFAULT 0, updated_at TEXT)"
        )
        cur.execute(
            "INSERT INTO user_preferences (user_id, work_stop_id) VALUES (1, NULL)"
        )
        conn.commit()
        conn.close()
        rootstore = {"userStore": {"currentUser": {"id": 1, "email": "t@t.com"}}}
        with open(os.path.join(self.state_dir, "rootstore.json"), "w") as f:
            json.dump(rootstore, f)

        self.scenario.stop_name = "Harbor Exchange"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
