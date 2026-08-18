# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for UncheckAllModesScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.transit.uncheck_all_modes.scenario import (
    UncheckAllModesScenario,
)


def _create_state(state_dir, preferred_modes='["subway","train"]', user_id=1):
    os.makedirs(state_dir, exist_ok=True)
    state_name = os.path.basename(state_dir)
    db_path = os.path.join(state_dir, f"{state_name}.db")
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
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
        "VALUES (?, 'stop-8', 'stop-2', ?)",
        (user_id, preferred_modes),
    )
    conn.commit()
    conn.close()

    rootstore = {
        "userStore": {"currentUser": {"id": user_id, "email": "test@test.com"}},
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(UncheckAllModesScenario):
    def __init__(self):
        pass


class TestUncheckAllModes(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.current_user_id = 1
        self.scenario.agent_answer = ""
        from digiworld.scenarios.state_manager import StateManager
        self.scenario._state_manager = StateManager(self.scenario)

    def test_empty_modes_passes(self):
        _create_state(self.state_dir, preferred_modes='[]')
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["all_modes_unchecked"])

    def test_double_encoded_empty_modes_passes(self):
        _create_state(self.state_dir, preferred_modes='"[]"')
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["all_modes_unchecked"])

    def test_modes_still_set_fails(self):
        _create_state(self.state_dir, preferred_modes='["subway","train"]')
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["all_modes_unchecked"])

    def test_single_mode_remaining_fails(self):
        _create_state(self.state_dir, preferred_modes='["bus"]')
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["all_modes_unchecked"])

    def test_no_preferences_raises(self):
        os.makedirs(self.state_dir, exist_ok=True)
        state_name = os.path.basename(self.state_dir)
        db_path = os.path.join(self.state_dir, f"{state_name}.db")
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()
        cur.execute(
            "CREATE TABLE user_preferences ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER UNIQUE, "
            "home_stop_id TEXT, work_stop_id TEXT, preferred_modes TEXT, "
            "language TEXT DEFAULT 'en', notification_service_alerts INTEGER DEFAULT 1, "
            "notification_departure_reminders INTEGER DEFAULT 1, "
            "notification_arrivals INTEGER DEFAULT 0, updated_at TEXT)"
        )
        conn.commit()
        conn.close()
        rootstore = {"userStore": {"currentUser": {"id": 1, "email": "t@t.com"}}}
        with open(os.path.join(self.state_dir, "rootstore.json"), "w") as f:
            json.dump(rootstore, f)

        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)


if __name__ == "__main__":
    unittest.main()
