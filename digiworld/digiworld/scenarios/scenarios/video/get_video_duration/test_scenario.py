# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetVideoDurationScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import GetVideoDurationScenario


SCHEMA_SQL = [
    (
        "CREATE TABLE videos ("
        "id INTEGER PRIMARY KEY, channel_id INTEGER, title TEXT, description TEXT, "
        "video_url TEXT, category_id INTEGER, thumbnail_url TEXT, duration INTEGER, "
        "visibility TEXT, status TEXT, view_count INTEGER, like_count INTEGER, "
        "comment_count INTEGER, is_comments_enabled INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    ),
]


def _make_db(tmp_dir, videos=None, db_name="default.db"):
    db_path = os.path.join(tmp_dir, db_name)
    conn = sqlite3.connect(db_path)
    for sql in SCHEMA_SQL:
        conn.execute(sql)
    for v in (videos or []):
        conn.execute(
            "INSERT INTO videos (id, channel_id, title, duration, status) "
            "VALUES (?, ?, ?, ?, ?)",
            (v["id"], v.get("channel_id", 1), v["title"],
             v["duration"], v.get("status", "active")),
        )
    conn.commit()
    conn.close()


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


class TestGetVideoDurationScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(GetVideoDurationScenario, "__init__",
                          lambda self, *a, **kw: None):
            scenario = GetVideoDurationScenario.__new__(GetVideoDurationScenario)
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = _execute_query_in_path
        scenario.agent_answer = kwargs.pop("agent_answer", "")
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_pass_exact_duration_mm_ss(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{"id": 1, "title": "Cool Video", "duration": 430}])
            scenario = self._make_scenario(
                title="Cool Video", initial_state_path=d,
                agent_answer="The video is 7:10 long."
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_pass_duration_in_total_seconds(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{"id": 1, "title": "Cool Video", "duration": 430}])
            scenario = self._make_scenario(
                title="Cool Video", initial_state_path=d,
                agent_answer="The video is 430 seconds long."
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_duration(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{"id": 1, "title": "Cool Video", "duration": 430}])
            scenario = self._make_scenario(
                title="Cool Video", initial_state_path=d,
                agent_answer="The video is 10:00 long."
            )
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_pass_within_tolerance(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{"id": 1, "title": "Cool Video", "duration": 430}])
            scenario = self._make_scenario(
                title="Cool Video", initial_state_path=d,
                agent_answer="The video is 7:13 long."
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_video_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d)
            scenario = self._make_scenario(
                title="Nonexistent", initial_state_path=d,
                agent_answer="5:00"
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
