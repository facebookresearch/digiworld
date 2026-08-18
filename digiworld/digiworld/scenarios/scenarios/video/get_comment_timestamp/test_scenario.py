# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetCommentTimestampScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import GetCommentTimestampScenario


class TestGetCommentTimestampScenario(unittest.TestCase):

    CREATE_VIDEOS = (
        "CREATE TABLE videos ("
        "id INTEGER PRIMARY KEY, channel_id INTEGER, title TEXT, "
        "description TEXT, video_url TEXT, category_id INTEGER, "
        "thumbnail_url TEXT, duration INTEGER, visibility TEXT, "
        "status TEXT, view_count INTEGER, like_count INTEGER, "
        "comment_count INTEGER, is_comments_enabled INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    )
    CREATE_COMMENTS = (
        "CREATE TABLE comments ("
        "id INTEGER PRIMARY KEY, video_id INTEGER, user_id INTEGER, "
        "parent_id INTEGER, content TEXT, status TEXT, is_edited INTEGER, "
        "reply_count INTEGER, created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    )

    def _make_db(self, tmp_dir, video_rows, comment_rows, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(self.CREATE_VIDEOS)
        conn.execute(self.CREATE_COMMENTS)
        for row in video_rows:
            conn.execute(
                "INSERT INTO videos (id, channel_id, title, status) VALUES (?, ?, ?, ?)",
                row,
            )
        for row in comment_rows:
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, "
                "status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                row,
            )
        conn.commit()
        conn.close()
        return db_path

    def _make_scenario(self, **kwargs):
        with patch.object(GetCommentTimestampScenario, "__init__", lambda self, *a, **kw: None):
            scenario = GetCommentTimestampScenario.__new__(GetCommentTimestampScenario)
        scenario._state_manager = MagicMock()
        for key, value in kwargs.items():
            setattr(scenario, key, value)
        return scenario

    def _setup_execute(self, scenario, state_dir):
        def execute_query_in_path(query, params, state_path):
            db_path = os.path.join(state_path, "default.db")
            conn = sqlite3.connect(db_path)
            result = conn.execute(query, params).fetchall()
            conn.close()
            return result
        scenario._execute_query_in_path = execute_query_in_path
        scenario.initial_state_path = state_dir

    def test_latest_comment_date(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d,
                [(9999, 1, "Test Video", "active")],
                [
                    (7777, 9999, 1, None, "Old comment", "visible", "2026-01-10 08:00:00.000"),
                    (7776, 9999, 1, None, "New comment", "visible", "2026-02-15 14:30:00.000"),
                ],
            )
            scenario = self._make_scenario(
                title="Test Video",
                order="latest",
                agent_answer="The comment was made on February 15, 2026",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_oldest_comment_date(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d,
                [(9999, 1, "Test Video", "active")],
                [
                    (7777, 9999, 1, None, "Old comment", "visible", "2026-01-10 08:00:00.000"),
                    (7776, 9999, 1, None, "New comment", "visible", "2026-02-15 14:30:00.000"),
                ],
            )
            scenario = self._make_scenario(
                title="Test Video",
                order="oldest",
                agent_answer="January 10, 2026",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_date_fails(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d,
                [(9999, 1, "Test Video", "active")],
                [(7777, 9999, 1, None, "Comment", "visible", "2026-01-10 08:00:00.000")],
            )
            scenario = self._make_scenario(
                title="Test Video",
                order="latest",
                agent_answer="March 5, 2026",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_no_comments_raises(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d, [(9999, 1, "Test Video", "active")], [])
            scenario = self._make_scenario(
                title="Test Video",
                order="latest",
                agent_answer="No comments",
            )
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_ignores_replies(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d,
                [(9999, 1, "Test Video", "active")],
                [
                    (7777, 9999, 1, None, "Top-level", "visible", "2026-01-10 08:00:00.000"),
                    (7776, 9999, 1, 7777, "Reply", "visible", "2026-03-01 12:00:00.000"),
                ],
            )
            scenario = self._make_scenario(
                title="Test Video",
                order="latest",
                agent_answer="January 10, 2026",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_iso_format_with_t_separator(self):
        with tempfile.TemporaryDirectory() as d:
            self._make_db(d,
                [(9999, 1, "Test Video", "active")],
                [(7777, 9999, 1, None, "Comment", "visible", "2026-01-10T08:00:00.000Z")],
            )
            scenario = self._make_scenario(
                title="Test Video",
                order="latest",
                agent_answer="2026-01-10",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_sort_direction_most_recent(self):
        scenario = self._make_scenario(order="most recent")
        self.assertEqual(scenario._sort_direction(), "DESC")

    def test_sort_direction_oldest(self):
        scenario = self._make_scenario(order="oldest")
        self.assertEqual(scenario._sort_direction(), "ASC")


if __name__ == "__main__":
    unittest.main()
