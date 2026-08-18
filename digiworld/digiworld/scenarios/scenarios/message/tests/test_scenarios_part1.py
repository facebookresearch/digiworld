# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for the first 7 message-app scenarios.

Each test creates in-memory temp directories with SQLite databases and
rootstore JSON files, then calls _get_checks directly to verify the
scenario verification logic without needing a real ADB backend.
"""

import json
import os
import sqlite3
import tempfile
import unittest

from digiworld.scenarios.scenarios.message.login_with_phone.scenario import (
    LoginWithPhoneScenario,
)
from digiworld.scenarios.scenarios.message.get_phone_number.scenario import (
    GetPhoneNumberScenario,
)
from digiworld.scenarios.scenarios.message.set_font_size.scenario import (
    SetFontSizeScenario,
)
from digiworld.scenarios.scenarios.message.set_chat_wallpaper.scenario import (
    SetChatWallpaperScenario,
)
from digiworld.scenarios.scenarios.message.change_profile_name.scenario import (
    ChangeProfileNameScenario,
)
from digiworld.scenarios.scenarios.message.restore_profile_name.scenario import (
    RestoreProfileNameScenario,
)
from digiworld.scenarios.scenarios.message.send_greeting_to_recent.scenario import (
    SendGreetingToRecentScenario,
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

SCHEMA = """\
CREATE TABLE users (
    id TEXT PRIMARY KEY, phone_number TEXT UNIQUE NOT NULL, name TEXT,
    avatar_url TEXT, last_logged_in INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE messages (
    id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL,
    message_type TEXT NOT NULL, content TEXT, timestamp INTEGER NOT NULL DEFAULT 0,
    is_read INTEGER NOT NULL DEFAULT 0, is_delivered INTEGER NOT NULL DEFAULT 0,
    deleted_by TEXT
);
CREATE TABLE groups (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, avatar_url TEXT,
    created_by TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1, deleted_by TEXT
);
CREATE TABLE group_members (
    group_id TEXT NOT NULL, user_id TEXT NOT NULL, exited_at INTEGER,
    PRIMARY KEY (group_id, user_id)
);
CREATE TABLE group_messages (
    id TEXT PRIMARY KEY, group_id TEXT, sender_id TEXT, message_type TEXT,
    content TEXT, timestamp INTEGER NOT NULL DEFAULT 0, is_read_by TEXT,
    is_delivered_to TEXT, deleted_by TEXT
);
CREATE TABLE chat_settings (
    user_id TEXT PRIMARY KEY, font_size TEXT NOT NULL DEFAULT 'medium',
    wallpaper TEXT, notification_tone TEXT
);
CREATE TABLE call_history (
    id TEXT PRIMARY KEY, caller_id TEXT, receiver_id TEXT, call_type TEXT,
    duration INTEGER, timestamp INTEGER NOT NULL DEFAULT 0,
    was_missed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE app_state (
    user_id TEXT PRIMARY KEY, last_screen TEXT,
    last_opened_timestamp INTEGER NOT NULL DEFAULT 0, scroll_positions TEXT
);
CREATE TABLE attachments (
    id TEXT PRIMARY KEY, message_id TEXT, file_type TEXT, file_path TEXT,
    preview TEXT
);
"""

DB_NAME = "default.db"


def _create_db(dir_path, inserts=None):
    """Create a SQLite database with the full schema and optional inserts."""
    db_path = os.path.join(dir_path, DB_NAME)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    if inserts:
        for sql, params in inserts:
            conn.execute(sql, params)
        conn.commit()
    conn.close()
    return db_path


def _write_rootstore(dir_path, data):
    """Write rootstore.json into *dir_path*."""
    path = os.path.join(dir_path, "rootstore.json")
    with open(path, "w") as f:
        json.dump(data, f)
    return path


def _make_scenario(cls, **attrs):
    """Instantiate a scenario class without calling Scenario.__init__.

    Patches ``_execute_query_in_path`` and ``compare_database_records`` so
    they operate directly against ``default.db`` files in temp directories.
    """
    obj = object.__new__(cls)
    for k, v in attrs.items():
        setattr(obj, k, v)

    def execute_in_path(query, params, state_path):
        db_path = os.path.join(state_path, DB_NAME)
        conn = sqlite3.connect(db_path)
        try:
            results = conn.execute(query, params).fetchall()
        finally:
            conn.close()
        return results

    obj._execute_query_in_path = execute_in_path

    def compare_records(state_1_path, state_2_path, query, params):
        set1 = set(tuple(r) for r in execute_in_path(query, params, state_1_path))
        set2 = set(tuple(r) for r in execute_in_path(query, params, state_2_path))
        return set1, set2, set2 - set1

    obj.compare_database_records = compare_records
    return obj


def _default_rootstore(**overrides):
    """Return a baseline rootstore dict, optionally merged with *overrides*."""
    rs = {
        "sessionStore": {
            "session": {
                "data": {
                    "screenName": "Home",
                    "route": "/(tabs)/home",
                    "sessionData": {"formData": {}},
                }
            }
        },
        "userStore": {
            "currentUser": {
                "id": "1",
                "phoneNumber": "+15551234567",
                "name": "Test User",
                "lastLoggedIn": 1000,
            }
        },
    }
    for key, val in overrides.items():
        if isinstance(val, dict) and key in rs:
            rs[key].update(val)
        else:
            rs[key] = val
    return rs


# ===================================================================
# 1. LoginWithPhoneScenario
# ===================================================================


class TestLoginWithPhoneScenario(unittest.TestCase):
    """Verify the login-with-phone re-login detection logic."""

    _USER_INSERT = (
        "INSERT INTO users (id, phone_number, name, last_logged_in) "
        "VALUES (?, ?, ?, ?)"
    )

    def test_pass_fresh_login_and_correct_phone(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User", 1000)),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User", 2000)),
            ])
            _write_rootstore(final_dir, _default_rootstore())

            scenario = _make_scenario(
                LoginWithPhoneScenario,
                current_user_id="1",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["fresh_login"])
            self.assertTrue(checks["correct_user"])

    def test_fail_same_last_logged_in(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User", 1000)),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User", 1000)),
            ])
            _write_rootstore(final_dir, _default_rootstore())

            scenario = _make_scenario(
                LoginWithPhoneScenario,
                current_user_id="1",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["fresh_login"])

    def test_fail_wrong_phone_in_rootstore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User", 1000)),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User", 2000)),
            ])
            wrong_rs = _default_rootstore()
            wrong_rs["userStore"]["currentUser"]["phoneNumber"] = "+19999999999"
            _write_rootstore(final_dir, wrong_rs)

            scenario = _make_scenario(
                LoginWithPhoneScenario,
                current_user_id="1",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["fresh_login"])
            self.assertFalse(checks["correct_user"])


# ===================================================================
# 2. GetPhoneNumberScenario
# ===================================================================


class TestGetPhoneNumberScenario(unittest.TestCase):
    """Verify the agent-answer phone-number check."""

    _USER_INSERT = (
        "INSERT INTO users (id, phone_number, name) VALUES (?, ?, ?)"
    )

    def test_pass_answer_contains_phone(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            os.makedirs(init_dir)
            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
            ])

            scenario = _make_scenario(
                GetPhoneNumberScenario,
                current_user_id="1",
                initial_state_path=init_dir,
                agent_answer="Your phone number is +15551234567.",
            )
            checks = scenario._get_checks(init_dir)
            self.assertTrue(checks["answer_matches"])

    def test_fail_answer_does_not_contain_phone(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            os.makedirs(init_dir)
            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
            ])

            scenario = _make_scenario(
                GetPhoneNumberScenario,
                current_user_id="1",
                initial_state_path=init_dir,
                agent_answer="I don't know your phone number.",
            )
            checks = scenario._get_checks(init_dir)
            self.assertFalse(checks["answer_matches"])

    def test_pass_phone_embedded_in_longer_answer(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            os.makedirs(init_dir)
            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
            ])

            scenario = _make_scenario(
                GetPhoneNumberScenario,
                current_user_id="1",
                initial_state_path=init_dir,
                agent_answer="According to the records, +15551234567 is yours.",
            )
            checks = scenario._get_checks(init_dir)
            self.assertTrue(checks["answer_matches"])


# ===================================================================
# 3. SetFontSizeScenario
# ===================================================================


class TestSetFontSizeScenario(unittest.TestCase):
    """Verify chat font-size update detection."""

    _SETTINGS_INSERT = (
        "INSERT INTO chat_settings (user_id, font_size) VALUES (?, ?)"
    )

    def test_pass_font_size_matches(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._SETTINGS_INSERT, ("1", "large")),
            ])

            scenario = _make_scenario(
                SetFontSizeScenario,
                current_user_id="1",
                font_size="large",
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["font_size_updated"])

    def test_fail_font_size_mismatch(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._SETTINGS_INSERT, ("1", "medium")),
            ])

            scenario = _make_scenario(
                SetFontSizeScenario,
                current_user_id="1",
                font_size="large",
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["font_size_updated"])

    def test_pass_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._SETTINGS_INSERT, ("1", "Large")),
            ])

            scenario = _make_scenario(
                SetFontSizeScenario,
                current_user_id="1",
                font_size="large",
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["font_size_updated"])

    def test_fail_no_chat_settings_row(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir)

            scenario = _make_scenario(
                SetFontSizeScenario,
                current_user_id="1",
                font_size="large",
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["font_size_updated"])


# ===================================================================
# 4. SetChatWallpaperScenario
# ===================================================================


class TestSetChatWallpaperScenario(unittest.TestCase):
    """Verify chat wallpaper update detection via rootstore + DB."""

    _SETTINGS_INSERT = (
        "INSERT INTO chat_settings (user_id, font_size, wallpaper) "
        "VALUES (?, ?, ?)"
    )

    def test_pass_gradient_wallpaper_in_rootstore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._SETTINGS_INSERT, ("1", "medium", None)),
            ])
            _write_rootstore(final_dir, {
                "userStore": {
                    "chatSettings": {"wallpaper": "/wallpapers/gradient.png"},
                    "currentUser": {"id": "1"},
                },
                "sessionStore": {},
            })

            scenario = _make_scenario(
                SetChatWallpaperScenario,
                current_user_id="1",
                wallpaper="gradient",
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["wallpaper_updated"])

    def test_pass_wallpaper_in_db_only(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._SETTINGS_INSERT, ("1", "medium", "/wallpapers/gradient.png")),
            ])
            _write_rootstore(final_dir, {
                "userStore": {"chatSettings": {}, "currentUser": {"id": "1"}},
                "sessionStore": {},
            })

            scenario = _make_scenario(
                SetChatWallpaperScenario,
                current_user_id="1",
                wallpaper="gradient",
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["wallpaper_updated"])

    def test_fail_wrong_wallpaper(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._SETTINGS_INSERT, ("1", "medium", "/wallpapers/space.png")),
            ])
            _write_rootstore(final_dir, {
                "userStore": {
                    "chatSettings": {"wallpaper": "/wallpapers/space.png"},
                    "currentUser": {"id": "1"},
                },
                "sessionStore": {},
            })

            scenario = _make_scenario(
                SetChatWallpaperScenario,
                current_user_id="1",
                wallpaper="gradient",
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["wallpaper_updated"])

    def test_fail_no_rootstore_file(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._SETTINGS_INSERT, ("1", "medium", None)),
            ])

            scenario = _make_scenario(
                SetChatWallpaperScenario,
                current_user_id="1",
                wallpaper="gradient",
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["wallpaper_updated"])


# ===================================================================
# 5. ChangeProfileNameScenario
# ===================================================================


class TestChangeProfileNameScenario(unittest.TestCase):
    """Verify profile-name change detection in both DB and rootstore."""

    _USER_INSERT = (
        "INSERT INTO users (id, phone_number, name) VALUES (?, ?, ?)"
    )

    def test_pass_name_changed_in_db_and_rootstore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "New Name")),
            ])
            _write_rootstore(final_dir, {
                "userStore": {"currentUser": {"id": "1", "name": "New Name"}},
                "sessionStore": {},
            })

            scenario = _make_scenario(
                ChangeProfileNameScenario,
                current_user_id="1",
                new_name="New Name",
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["name_changed"])

    def test_fail_db_name_unchanged(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Old Name")),
            ])
            _write_rootstore(final_dir, {
                "userStore": {"currentUser": {"id": "1", "name": "Old Name"}},
                "sessionStore": {},
            })

            scenario = _make_scenario(
                ChangeProfileNameScenario,
                current_user_id="1",
                new_name="New Name",
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["name_changed"])

    def test_fail_rootstore_name_mismatch(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "New Name")),
            ])
            _write_rootstore(final_dir, {
                "userStore": {"currentUser": {"id": "1", "name": "Stale Name"}},
                "sessionStore": {},
            })

            scenario = _make_scenario(
                ChangeProfileNameScenario,
                current_user_id="1",
                new_name="New Name",
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["name_changed"])

    def test_pass_case_insensitive_match(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "new name")),
            ])
            _write_rootstore(final_dir, {
                "userStore": {"currentUser": {"id": "1", "name": "New Name"}},
                "sessionStore": {},
            })

            scenario = _make_scenario(
                ChangeProfileNameScenario,
                current_user_id="1",
                new_name="New Name",
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["name_changed"])


# ===================================================================
# 6. RestoreProfileNameScenario
# ===================================================================


class TestRestoreProfileNameScenario(unittest.TestCase):
    """Verify profile-name restoration to the original value."""

    _USER_INSERT = (
        "INSERT INTO users (id, phone_number, name) VALUES (?, ?, ?)"
    )

    def test_pass_name_restored(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Original Name")),
            ])

            scenario = _make_scenario(
                RestoreProfileNameScenario,
                current_user_id="1",
                resolved_scenario_context={"originalName": "Original Name"},
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["name_restored"])

    def test_fail_name_still_changed(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Still Changed")),
            ])

            scenario = _make_scenario(
                RestoreProfileNameScenario,
                current_user_id="1",
                resolved_scenario_context={"originalName": "Original Name"},
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["name_restored"])

    def test_pass_case_insensitive_restore(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "original name")),
            ])

            scenario = _make_scenario(
                RestoreProfileNameScenario,
                current_user_id="1",
                resolved_scenario_context={"originalName": "Original Name"},
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["name_restored"])

    def test_fail_missing_original_name_in_context(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(final_dir)
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Some Name")),
            ])

            scenario = _make_scenario(
                RestoreProfileNameScenario,
                current_user_id="1",
                resolved_scenario_context={},
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(final_dir)


# ===================================================================
# 7. SendGreetingToRecentScenario
# ===================================================================


class TestSendGreetingToRecentScenario(unittest.TestCase):
    """Verify that a greeting was sent to the most recent contact."""

    _USER_INSERT = (
        "INSERT INTO users (id, phone_number, name) VALUES (?, ?, ?)"
    )
    _MSG_INSERT = (
        "INSERT INTO messages "
        "(id, sender_id, receiver_id, message_type, content, timestamp) "
        "VALUES (?, ?, ?, ?, ?, ?)"
    )

    def test_pass_greeting_sent_to_most_recent(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._USER_INSERT, ("3", "+15550001111", "Bob")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Hi", 500)),
                (self._MSG_INSERT, ("m2", "3", "1", "text", "Yo", 1000)),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._USER_INSERT, ("3", "+15550001111", "Bob")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Hi", 500)),
                (self._MSG_INSERT, ("m2", "3", "1", "text", "Yo", 1000)),
                (self._MSG_INSERT, ("m3", "1", "3", "text", "Hello Bob!", 2000)),
            ])

            scenario = _make_scenario(
                SendGreetingToRecentScenario,
                current_user_id="1",
                greeting="Hello",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["message_sent"])

    def test_fail_no_new_message_sent(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Hey", 1000)),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Hey", 1000)),
            ])

            scenario = _make_scenario(
                SendGreetingToRecentScenario,
                current_user_id="1",
                greeting="Hello",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["message_sent"])

    def test_fail_wrong_greeting_content(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Hey", 1000)),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Hey", 1000)),
                (self._MSG_INSERT, ("m2", "1", "2", "text", "Goodbye!", 2000)),
            ])

            scenario = _make_scenario(
                SendGreetingToRecentScenario,
                current_user_id="1",
                greeting="Hello",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["message_sent"])

    def test_fail_message_sent_to_wrong_contact(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._USER_INSERT, ("3", "+15550001111", "Bob")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Old msg", 500)),
                (self._MSG_INSERT, ("m2", "3", "1", "text", "Recent", 1000)),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._USER_INSERT, ("3", "+15550001111", "Bob")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Old msg", 500)),
                (self._MSG_INSERT, ("m2", "3", "1", "text", "Recent", 1000)),
                # Greeting sent to Alice (user 2) instead of Bob (user 3, most recent)
                (self._MSG_INSERT, ("m3", "1", "2", "text", "Hello!", 2000)),
            ])

            scenario = _make_scenario(
                SendGreetingToRecentScenario,
                current_user_id="1",
                greeting="Hello",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["message_sent"])

    def test_pass_when_most_recent_message_deleted_by_other_user(self):
        msg_insert_with_deleted_by = (
            "INSERT INTO messages "
            "(id, sender_id, receiver_id, message_type, content, timestamp, deleted_by) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)"
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            init_dir = os.path.join(tmpdir, "init")
            final_dir = os.path.join(tmpdir, "final")
            os.makedirs(init_dir)
            os.makedirs(final_dir)

            _create_db(init_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._USER_INSERT, ("3", "+15550001111", "Bob")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Older", 500)),
                (
                    msg_insert_with_deleted_by,
                    ("m2", "3", "1", "text", "Newest visible", 1000, "3"),
                ),
            ])
            _create_db(final_dir, [
                (self._USER_INSERT, ("1", "+15551234567", "Test User")),
                (self._USER_INSERT, ("2", "+15559876543", "Alice")),
                (self._USER_INSERT, ("3", "+15550001111", "Bob")),
                (self._MSG_INSERT, ("m1", "2", "1", "text", "Older", 500)),
                (
                    msg_insert_with_deleted_by,
                    ("m2", "3", "1", "text", "Newest visible", 1000, "3"),
                ),
                (self._MSG_INSERT, ("m3", "1", "3", "text", "Yo, you there?", 2000)),
            ])

            scenario = _make_scenario(
                SendGreetingToRecentScenario,
                current_user_id="1",
                greeting="Yo, you there?",
                initial_state_path=init_dir,
            )
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["message_sent"])


if __name__ == "__main__":
    unittest.main()
