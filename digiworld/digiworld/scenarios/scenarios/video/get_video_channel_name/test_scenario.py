# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetVideoChannelNameScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import GetVideoChannelNameScenario


SCHEMA_SQL = [
    (
        "CREATE TABLE videos ("
        "id INTEGER PRIMARY KEY, channel_id INTEGER, title TEXT, description TEXT, "
        "video_url TEXT, category_id INTEGER, thumbnail_url TEXT, duration INTEGER, "
        "visibility TEXT, status TEXT, view_count INTEGER, like_count INTEGER, "
        "comment_count INTEGER, is_comments_enabled INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    ),
    (
        "CREATE TABLE channels ("
        "id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT, description TEXT, "
        "banner TEXT, avatar TEXT, subscriber_count INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    ),
]


def _make_db(tmp_dir, channels=None, videos=None, db_name="default.db"):
    db_path = os.path.join(tmp_dir, db_name)
    conn = sqlite3.connect(db_path)
    for sql in SCHEMA_SQL:
        conn.execute(sql)
    for ch in (channels or []):
        conn.execute(
            "INSERT INTO channels (id, user_id, name, subscriber_count) "
            "VALUES (?, ?, ?, ?)",
            (ch["id"], ch.get("user_id", 1), ch["name"],
             ch.get("subscriber_count", 1000)),
        )
    for v in (videos or []):
        conn.execute(
            "INSERT INTO videos (id, channel_id, title, status) "
            "VALUES (?, ?, ?, ?)",
            (v["id"], v["channel_id"], v["title"], v.get("status", "active")),
        )
    conn.commit()
    conn.close()


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


class TestGetVideoChannelNameScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(GetVideoChannelNameScenario, "__init__",
                          lambda self, *a, **kw: None):
            scenario = GetVideoChannelNameScenario.__new__(
                GetVideoChannelNameScenario
            )
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = _execute_query_in_path
        scenario.agent_answer = kwargs.pop("agent_answer", "")
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_pass_correct_channel_name(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(
                d,
                channels=[{"id": 5, "name": "TechReviews"}],
                videos=[{"id": 1, "channel_id": 5, "title": "Best Laptops 2026"}],
            )
            scenario = self._make_scenario(
                title="Best Laptops 2026", initial_state_path=d,
                agent_answer="The channel is TechReviews.",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_pass_case_insensitive(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(
                d,
                channels=[{"id": 5, "name": "TechReviews"}],
                videos=[{"id": 1, "channel_id": 5, "title": "Best Laptops 2026"}],
            )
            scenario = self._make_scenario(
                title="Best Laptops 2026", initial_state_path=d,
                agent_answer="The channel is techreviews.",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_channel_name(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(
                d,
                channels=[{"id": 5, "name": "TechReviews"}],
                videos=[{"id": 1, "channel_id": 5, "title": "Best Laptops 2026"}],
            )
            scenario = self._make_scenario(
                title="Best Laptops 2026", initial_state_path=d,
                agent_answer="The channel is GadgetGuru.",
            )
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_video_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, channels=[{"id": 5, "name": "TechReviews"}])
            scenario = self._make_scenario(
                title="Nonexistent Video", initial_state_path=d,
                agent_answer="TechReviews",
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_channel_name_as_substring(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(
                d,
                channels=[{"id": 5, "name": "Nature Documentary Hub"}],
                videos=[{"id": 1, "channel_id": 5, "title": "Ocean Life"}],
            )
            scenario = self._make_scenario(
                title="Ocean Life", initial_state_path=d,
                agent_answer="The uploader's channel is Nature Documentary Hub, "
                             "which has great content.",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
