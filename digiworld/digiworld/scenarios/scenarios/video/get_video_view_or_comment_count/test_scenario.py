# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetVideoViewOrCommentCountScenario."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import GetVideoViewOrCommentCountScenario


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
            "INSERT INTO videos "
            "(id, channel_id, title, status, view_count, comment_count) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (v["id"], v.get("channel_id", 1), v["title"],
             v.get("status", "active"),
             v.get("view_count", 0), v.get("comment_count", 0)),
        )
    conn.commit()
    conn.close()


def _execute_query_in_path(query, params, state_path):
    db_path = os.path.join(state_path, "default.db")
    conn = sqlite3.connect(db_path)
    result = conn.execute(query, params).fetchall()
    conn.close()
    return result


class TestGetVideoViewOrCommentCountScenario(unittest.TestCase):

    def _make_scenario(self, **kwargs):
        with patch.object(GetVideoViewOrCommentCountScenario, "__init__",
                          lambda self, *a, **kw: None):
            scenario = GetVideoViewOrCommentCountScenario.__new__(
                GetVideoViewOrCommentCountScenario
            )
        scenario.current_user_id = kwargs.pop("current_user_id", 1)
        scenario.initial_state_path = kwargs.pop("initial_state_path", "/tmp")
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = _execute_query_in_path
        scenario.agent_answer = kwargs.pop("agent_answer", "")
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def test_pass_view_count(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{
                "id": 1, "title": "Trending Now",
                "view_count": 5432, "comment_count": 89,
            }])
            scenario = self._make_scenario(
                title="Trending Now", metric="views",
                initial_state_path=d,
                agent_answer="This video has 5,432 views.",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_pass_comment_count(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{
                "id": 1, "title": "Trending Now",
                "view_count": 5432, "comment_count": 89,
            }])
            scenario = self._make_scenario(
                title="Trending Now", metric="comments",
                initial_state_path=d,
                agent_answer="There are 89 comments on the video.",
            )
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_fail_wrong_count(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{
                "id": 1, "title": "Trending Now",
                "view_count": 5432, "comment_count": 89,
            }])
            scenario = self._make_scenario(
                title="Trending Now", metric="views",
                initial_state_path=d,
                agent_answer="The video has 1000 views.",
            )
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_unknown_metric_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, videos=[{
                "id": 1, "title": "Test",
                "view_count": 100, "comment_count": 5,
            }])
            scenario = self._make_scenario(
                title="Test", metric="likes",
                initial_state_path=d,
                agent_answer="100",
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_video_not_found_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d)
            scenario = self._make_scenario(
                title="Nonexistent", metric="views",
                initial_state_path=d,
                agent_answer="0",
            )
            with self.assertRaises(ValueError):
                scenario._get_checks(d)


if __name__ == "__main__":
    unittest.main()
