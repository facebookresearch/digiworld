"""Unit tests for message scenarios 9-17."""

import json
import os
import sqlite3

import pytest

from digiworld.scenarios.scenarios.message.create_group_with_latest_contacts.scenario import (
    CreateGroupWithLatestContactsScenario,
)
from digiworld.scenarios.scenarios.message.send_group_message.scenario import (
    SendGroupMessageScenario,
)
from digiworld.scenarios.scenarios.message.remove_from_group.scenario import (
    RemoveFromGroupScenario,
)
from digiworld.scenarios.scenarios.message.delete_group.scenario import (
    DeleteGroupScenario,
)
from digiworld.scenarios.scenarios.message.voice_call_contact.scenario import (
    VoiceCallContactScenario,
)
from digiworld.scenarios.scenarios.message.mute_and_speaker.scenario import (
    MuteAndSpeakerScenario,
)
from digiworld.scenarios.scenarios.message.hang_up_call.scenario import (
    HangUpCallScenario,
)
from digiworld.scenarios.scenarios.message.video_call_contact.scenario import (
    VideoCallContactScenario,
)
from digiworld.scenarios.scenarios.message.camera_off_hang_up.scenario import (
    CameraOffHangUpScenario,
)
from digiworld.scenarios.scenarios.message.call_and_mute_speaker.scenario import (
    CallAndMuteSpeakerScenario,
)


# ═════════════════════════════════════════════════════════════════════════════
# Helpers
# ═════════════════════════════════════════════════════════════════════════════

SCHEMA = """\
CREATE TABLE users (id TEXT PRIMARY KEY, phone_number TEXT UNIQUE NOT NULL, name TEXT, avatar_url TEXT, last_logged_in INTEGER NOT NULL DEFAULT 0);
CREATE TABLE messages (id TEXT PRIMARY KEY, sender_id TEXT NOT NULL, receiver_id TEXT NOT NULL, message_type TEXT NOT NULL, content TEXT, timestamp INTEGER NOT NULL DEFAULT 0, is_read INTEGER NOT NULL DEFAULT 0, is_delivered INTEGER NOT NULL DEFAULT 0, deleted_by TEXT);
CREATE TABLE groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, avatar_url TEXT, created_by TEXT NOT NULL, created_at INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1, deleted_by TEXT);
CREATE TABLE group_members (group_id TEXT NOT NULL, user_id TEXT NOT NULL, exited_at INTEGER, PRIMARY KEY (group_id, user_id));
CREATE TABLE group_messages (id TEXT PRIMARY KEY, group_id TEXT, sender_id TEXT, message_type TEXT, content TEXT, timestamp INTEGER NOT NULL DEFAULT 0, is_read_by TEXT, is_delivered_to TEXT, deleted_by TEXT);
CREATE TABLE chat_settings (user_id TEXT PRIMARY KEY, font_size TEXT NOT NULL DEFAULT 'medium', wallpaper TEXT, notification_tone TEXT);
CREATE TABLE call_history (id TEXT PRIMARY KEY, caller_id TEXT, receiver_id TEXT, call_type TEXT, duration INTEGER, timestamp INTEGER NOT NULL DEFAULT 0, was_missed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE app_state (user_id TEXT PRIMARY KEY, last_screen TEXT, last_opened_timestamp INTEGER NOT NULL DEFAULT 0, scroll_positions TEXT);
CREATE TABLE attachments (id TEXT PRIMARY KEY, message_id TEXT, file_type TEXT, file_path TEXT, preview TEXT);
"""

_USER_INS = "INSERT INTO users (id, phone_number, name) VALUES (?, ?, ?)"
_MSG_INS = (
    "INSERT INTO messages (id, sender_id, receiver_id, message_type, content, timestamp) "
    "VALUES (?, ?, ?, ?, ?, ?)"
)
_GROUP_INS = (
    "INSERT INTO groups (id, name, description, created_by, created_at, is_active, deleted_by) "
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
)
_GMEMBER_INS = "INSERT INTO group_members (group_id, user_id, exited_at) VALUES (?, ?, ?)"
_GMSG_INS = (
    "INSERT INTO group_messages (id, group_id, sender_id, message_type, content, timestamp, deleted_by) "
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
)
_CALL_INS = (
    "INSERT INTO call_history (id, caller_id, receiver_id, call_type, duration, timestamp, was_missed) "
    "VALUES (?, ?, ?, ?, ?, ?, ?)"
)


def _create_db(path):
    conn = sqlite3.connect(str(path))
    conn.executescript(SCHEMA)
    conn.close()


def _exec(path, sql, params=()):
    conn = sqlite3.connect(str(path))
    conn.execute(sql, params)
    conn.commit()
    conn.close()


def _seed_users(db, *users):
    for uid, phone, name in users:
        _exec(db, _USER_INS, (uid, phone, name))


def _write_rootstore(directory, data):
    with open(os.path.join(str(directory), "rootstore.json"), "w") as f:
        json.dump(data, f)


def _make_scenario(cls, **attrs):
    """Instantiate *cls* without calling ``Scenario.__init__``."""
    obj = object.__new__(cls)
    for k, v in attrs.items():
        setattr(obj, k, v)

    def execute_in_path(query, params, state_path):
        db_files = [f for f in os.listdir(state_path) if f.endswith(".db")]
        if not db_files:
            raise FileNotFoundError(f"No DB in {state_path}")
        conn = sqlite3.connect(os.path.join(state_path, db_files[0]))
        rows = conn.execute(query, params).fetchall()
        conn.close()
        return rows

    obj._execute_query_in_path = execute_in_path

    def compare_records(p1, p2, query, params):
        r1 = set(tuple(r) for r in execute_in_path(query, params, p1))
        r2 = set(tuple(r) for r in execute_in_path(query, params, p2))
        return (
            [list(r) for r in r1 & r2],
            [list(r) for r in r1 - r2],
            [list(r) for r in r2 - r1],
        )

    obj.compare_database_records = compare_records
    return obj


def _rootstore_on_screen(screen_name, form_data=None):
    return {
        "sessionStore": {
            "session": {
                "data": {
                    "screenName": screen_name,
                    "route": f"/(tabs)/{screen_name.lower()}",
                    "sessionData": {
                        "formData": form_data or {},
                    },
                }
            }
        }
    }


# ═════════════════════════════════════════════════════════════════════════════
# 9. CreateGroupWithLatestContactsScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestCreateGroupWithLatestContacts:

    @staticmethod
    def _seed_initial(db):
        """User 1 with three contacts having messages at different timestamps."""
        _seed_users(
            db,
            ("1", "+15551111111", "Test User"),
            ("2", "+15552222222", "Alice"),
            ("3", "+15553333333", "Bob"),
            ("4", "+15554444444", "Charlie"),
        )
        _exec(db, _MSG_INS, ("m1", "1", "2", "text", "Hi Alice", 100))
        _exec(db, _MSG_INS, ("m2", "1", "3", "text", "Hi Bob", 200))
        _exec(db, _MSG_INS, ("m3", "1", "4", "text", "Hi Charlie", 300))

    def test_pass_group_created_with_correct_members(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        self._seed_initial(idb)
        self._seed_initial(fdb)
        _exec(fdb, _GROUP_INS, ("g1", "Test Group", "A test group", "1", 500, 1, None))
        _exec(fdb, _GMEMBER_INS, ("g1", "2", None))
        _exec(fdb, _GMEMBER_INS, ("g1", "3", None))
        _exec(fdb, _GMEMBER_INS, ("g1", "4", None))

        s = _make_scenario(
            CreateGroupWithLatestContactsScenario,
            current_user_id="1",
            group_name="Test Group",
            group_description="A test group",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {
            "group_exists": True,
            "group_description_matches": True,
            "correct_members": True,
        }

    def test_fail_missing_member(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        self._seed_initial(idb)
        self._seed_initial(fdb)
        _exec(fdb, _GROUP_INS, ("g1", "Test Group", "A test group", "1", 500, 1, None))
        _exec(fdb, _GMEMBER_INS, ("g1", "2", None))
        _exec(fdb, _GMEMBER_INS, ("g1", "3", None))

        s = _make_scenario(
            CreateGroupWithLatestContactsScenario,
            current_user_id="1",
            group_name="Test Group",
            group_description="A test group",
            initial_state_path=str(initial_dir),
        )

        checks = s._get_checks(str(final_dir))
        assert checks["group_exists"] is True
        assert checks["group_description_matches"] is True
        assert checks["correct_members"] is False

    def test_ignores_messages_deleted_by_other_users_only(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _seed_users(
            idb,
            ("1", "+15551111111", "Test User"),
            ("2", "+15552222222", "Alice"),
            ("3", "+15553333333", "Bob"),
            ("4", "+15554444444", "Charlie"),
            ("5", "+15555555555", "Dana"),
        )
        _seed_users(
            fdb,
            ("1", "+15551111111", "Test User"),
            ("2", "+15552222222", "Alice"),
            ("3", "+15553333333", "Bob"),
            ("4", "+15554444444", "Charlie"),
            ("5", "+15555555555", "Dana"),
        )

        msg_with_deleted_by = (
            "INSERT INTO messages "
            "(id, sender_id, receiver_id, message_type, content, timestamp, deleted_by) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        for db in (idb, fdb):
            _exec(db, msg_with_deleted_by, ("m1", "1", "2", "text", "Hi Alice", 100, "9"))
            _exec(db, msg_with_deleted_by, ("m2", "1", "3", "text", "Hi Bob", 350, "1"))
            _exec(db, msg_with_deleted_by, ("m3", "1", "4", "text", "Hi Charlie", 300, None))
            _exec(db, msg_with_deleted_by, ("m4", "1", "5", "text", "Hi Dana", 400, None))

        _exec(
            fdb,
            _GROUP_INS,
            ("g1", "Test Group", "A test group", "1", 500, 1, None),
        )
        _exec(fdb, _GMEMBER_INS, ("g1", "2", None))
        _exec(fdb, _GMEMBER_INS, ("g1", "4", None))
        _exec(fdb, _GMEMBER_INS, ("g1", "5", None))

        s = _make_scenario(
            CreateGroupWithLatestContactsScenario,
            current_user_id="1",
            group_name="Test Group",
            group_description="A test group",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {
            "group_exists": True,
            "group_description_matches": True,
            "correct_members": True,
        }


# ═════════════════════════════════════════════════════════════════════════════
# 10. SendGroupMessageScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestSendGroupMessage:

    def test_pass_message_sent(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _exec(idb, _GROUP_INS, ("g1", "My Group", "desc", "1", 100, 1, None))
        _exec(fdb, _GROUP_INS, ("g1", "My Group", "desc", "1", 100, 1, None))
        _exec(fdb, _GMSG_INS, ("gm1", "g1", "1", "text", "Hello everyone", 500, None))

        s = _make_scenario(
            SendGroupMessageScenario,
            current_user_id="1",
            group_name="My Group",
            message_content="Hello everyone",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {"message_sent": True}

    def test_fail_no_new_message(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _exec(idb, _GROUP_INS, ("g1", "My Group", "desc", "1", 100, 1, None))
        _exec(fdb, _GROUP_INS, ("g1", "My Group", "desc", "1", 100, 1, None))

        s = _make_scenario(
            SendGroupMessageScenario,
            current_user_id="1",
            group_name="My Group",
            message_content="Hello everyone",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {"message_sent": False}


# ═════════════════════════════════════════════════════════════════════════════
# 11. RemoveFromGroupScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestRemoveFromGroup:

    @staticmethod
    def _seed_group(db, member4_exited_at=None):
        _exec(db, _GROUP_INS, ("g1", "Team Chat", "Team", "1", 100, 1, None))
        _exec(db, _GMEMBER_INS, ("g1", "1", None))
        _exec(db, _GMEMBER_INS, ("g1", "2", None))
        _exec(db, _GMEMBER_INS, ("g1", "3", None))
        _exec(db, _GMEMBER_INS, ("g1", "4", member4_exited_at))

    def test_pass_member_removed(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        self._seed_group(idb)
        self._seed_group(fdb, member4_exited_at=1000)

        s = _make_scenario(
            RemoveFromGroupScenario,
            current_user_id="1",
            group_name="Team Chat",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {
            "member_count_decreased": True,
            "member_exited": True,
        }

    def test_fail_no_member_removed(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        self._seed_group(idb)
        self._seed_group(fdb)

        s = _make_scenario(
            RemoveFromGroupScenario,
            current_user_id="1",
            group_name="Team Chat",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {
            "member_count_decreased": False,
            "member_exited": False,
        }


# ═════════════════════════════════════════════════════════════════════════════
# 12. DeleteGroupScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestDeleteGroup:

    def test_pass_group_fully_deleted(self, tmp_path):
        final_dir = tmp_path / "final"
        final_dir.mkdir()
        fdb = final_dir / "state.db"
        _create_db(fdb)

        _exec(fdb, _GROUP_INS, ("g1", "Old Group", "Old", "1", 100, 1, "1"))
        _exec(fdb, _GMSG_INS, ("gm1", "g1", "2", "text", "Hi", 200, "1"))
        _exec(fdb, _GMSG_INS, ("gm2", "g1", "3", "text", "Hey", 300, "1"))
        _exec(fdb, _GMEMBER_INS, ("g1", "1", None))
        _exec(fdb, _GMEMBER_INS, ("g1", "2", 500))
        _exec(fdb, _GMEMBER_INS, ("g1", "3", 500))

        s = _make_scenario(
            DeleteGroupScenario,
            current_user_id="1",
            group_name="Old Group",
        )

        assert s._get_checks(str(final_dir)) == {
            "messages_cleared": True,
            "members_removed": True,
            "group_deleted": True,
        }

    def test_fail_group_not_deleted(self, tmp_path):
        final_dir = tmp_path / "final"
        final_dir.mkdir()
        fdb = final_dir / "state.db"
        _create_db(fdb)

        _exec(fdb, _GROUP_INS, ("g1", "Old Group", "Old", "1", 100, 1, None))
        _exec(fdb, _GMSG_INS, ("gm1", "g1", "2", "text", "Hi", 200, None))
        _exec(fdb, _GMEMBER_INS, ("g1", "1", None))
        _exec(fdb, _GMEMBER_INS, ("g1", "2", None))

        s = _make_scenario(
            DeleteGroupScenario,
            current_user_id="1",
            group_name="Old Group",
        )

        assert s._get_checks(str(final_dir)) == {
            "messages_cleared": False,
            "members_removed": False,
            "group_deleted": False,
        }


# ═════════════════════════════════════════════════════════════════════════════
# 13. VoiceCallContactScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestVoiceCallContact:

    def test_pass_call_initiated(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _seed_users(idb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "voice", 0, 500, 0))

        s = _make_scenario(
            VoiceCallContactScenario,
            current_user_id="1",
            contact_name="Bob Smith",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {"call_initiated": True}

    def test_fail_no_call(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _seed_users(idb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))

        s = _make_scenario(
            VoiceCallContactScenario,
            current_user_id="1",
            contact_name="Bob Smith",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {"call_initiated": False}


# ═════════════════════════════════════════════════════════════════════════════
# 14. MuteAndSpeakerScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestMuteAndSpeaker:

    def test_pass_muted_and_speaker_on(self, tmp_path):
        state_dir = tmp_path / "final"
        state_dir.mkdir()

        _write_rootstore(
            state_dir,
            _rootstore_on_screen("Call", {"isMuted": True, "isSpeakerOn": True}),
        )

        s = _make_scenario(MuteAndSpeakerScenario, current_user_id="1")

        assert s._get_checks(str(state_dir)) == {
            "on_call_screen": True,
            "microphone_muted": True,
            "speaker_on": True,
        }

    def test_fail_on_home_screen(self, tmp_path):
        state_dir = tmp_path / "final"
        state_dir.mkdir()

        _write_rootstore(state_dir, _rootstore_on_screen("Home"))

        s = _make_scenario(MuteAndSpeakerScenario, current_user_id="1")

        assert s._get_checks(str(state_dir)) == {
            "on_call_screen": False,
            "microphone_muted": False,
            "speaker_on": False,
        }


# ═════════════════════════════════════════════════════════════════════════════
# 15. HangUpCallScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestHangUpCall:

    def test_pass_call_completed_and_ended(self, tmp_path):
        final_dir = tmp_path / "final"
        final_dir.mkdir()
        fdb = final_dir / "state.db"
        _create_db(fdb)

        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "voice", 120, 500, 0))
        _write_rootstore(final_dir, _rootstore_on_screen("Home"))

        s = _make_scenario(
            HangUpCallScenario,
            current_user_id="1",
            contact_name="Bob Smith",
        )

        assert s._get_checks(str(final_dir)) == {
            "call_completed": True,
            "call_ended": True,
        }

    def test_fail_still_on_call_screen(self, tmp_path):
        final_dir = tmp_path / "final"
        final_dir.mkdir()
        fdb = final_dir / "state.db"
        _create_db(fdb)

        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "voice", 0, 500, 0))
        _write_rootstore(final_dir, _rootstore_on_screen("Call"))

        s = _make_scenario(
            HangUpCallScenario,
            current_user_id="1",
            contact_name="Bob Smith",
        )

        assert s._get_checks(str(final_dir)) == {
            "call_completed": False,
            "call_ended": False,
        }


# ═════════════════════════════════════════════════════════════════════════════
# 16. VideoCallContactScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestVideoCallContact:

    def test_pass_video_call_initiated(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _seed_users(idb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "video", 0, 500, 0))

        s = _make_scenario(
            VideoCallContactScenario,
            current_user_id="1",
            contact_name="Bob Smith",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {"call_initiated": True}

    def test_fail_wrong_call_type(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _seed_users(idb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "voice", 0, 500, 0))

        s = _make_scenario(
            VideoCallContactScenario,
            current_user_id="1",
            contact_name="Bob Smith",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {"call_initiated": False}


# ═════════════════════════════════════════════════════════════════════════════
# 16b. CallAndMuteSpeakerScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestCallAndMuteSpeaker:

    def test_pass_when_call_matches_contact_and_controls_enabled(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _seed_users(
            idb,
            ("1", "+15551111111", "Test User"),
            ("2", "+15552222222", "Nadia Al-Hussein"),
        )
        _seed_users(
            fdb,
            ("1", "+15551111111", "Test User"),
            ("2", "+15552222222", "Nadia Al-Hussein"),
        )
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "voice", 0, 500, 0))
        _write_rootstore(
            final_dir,
            _rootstore_on_screen(
                "Call",
                {
                    "contactName": "Nadia Al-Hussein",
                    "isMuted": True,
                    "isSpeakerOn": True,
                },
            ),
        )

        s = _make_scenario(
            CallAndMuteSpeakerScenario,
            current_user_id="1",
            contact_name="Nadia Al-Hussein",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {
            "call_initiated": True,
            "on_call_screen": True,
            "microphone_muted": True,
            "speaker_on": True,
        }

    def test_fail_when_call_screen_is_for_different_contact(self, tmp_path):
        initial_dir = tmp_path / "initial"
        final_dir = tmp_path / "final"
        initial_dir.mkdir()
        final_dir.mkdir()

        idb = initial_dir / "state.db"
        fdb = final_dir / "state.db"
        _create_db(idb)
        _create_db(fdb)

        _seed_users(
            idb,
            ("1", "+15551111111", "Test User"),
            ("2", "+15552222222", "Nadia Al-Hussein"),
            ("3", "+15553333333", "Bob Smith"),
        )
        _seed_users(
            fdb,
            ("1", "+15551111111", "Test User"),
            ("2", "+15552222222", "Nadia Al-Hussein"),
            ("3", "+15553333333", "Bob Smith"),
        )
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "voice", 0, 500, 0))
        _write_rootstore(
            final_dir,
            _rootstore_on_screen(
                "Call",
                {
                    "contactName": "Bob Smith",
                    "isMuted": True,
                    "isSpeakerOn": True,
                },
            ),
        )

        s = _make_scenario(
            CallAndMuteSpeakerScenario,
            current_user_id="1",
            contact_name="Nadia Al-Hussein",
            initial_state_path=str(initial_dir),
        )

        assert s._get_checks(str(final_dir)) == {
            "call_initiated": True,
            "on_call_screen": False,
            "microphone_muted": True,
            "speaker_on": True,
        }


# ═════════════════════════════════════════════════════════════════════════════
# 17. CameraOffHangUpScenario
# ═════════════════════════════════════════════════════════════════════════════

class TestCameraOffHangUp:

    def test_pass_video_call_completed_and_ended(self, tmp_path):
        final_dir = tmp_path / "final"
        final_dir.mkdir()
        fdb = final_dir / "state.db"
        _create_db(fdb)

        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "video", 90, 500, 0))
        _write_rootstore(final_dir, _rootstore_on_screen("Home"))

        s = _make_scenario(
            CameraOffHangUpScenario,
            current_user_id="1",
            contact_name="Bob Smith",
        )

        assert s._get_checks(str(final_dir)) == {
            "video_call_completed": True,
            "call_ended": True,
        }

    def test_fail_no_video_call(self, tmp_path):
        final_dir = tmp_path / "final"
        final_dir.mkdir()
        fdb = final_dir / "state.db"
        _create_db(fdb)

        _seed_users(fdb, ("1", "+15551111111", "Test User"), ("2", "+15552222222", "Bob Smith"))
        _exec(fdb, _CALL_INS, ("c1", "1", "2", "voice", 90, 500, 0))
        _write_rootstore(final_dir, _rootstore_on_screen("Home"))

        s = _make_scenario(
            CameraOffHangUpScenario,
            current_user_id="1",
            contact_name="Bob Smith",
        )

        checks = s._get_checks(str(final_dir))
        assert checks["video_call_completed"] is False
        assert checks["call_ended"] is True
