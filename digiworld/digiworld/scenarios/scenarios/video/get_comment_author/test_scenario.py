# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for GetCommentAuthorScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import GetCommentAuthorScenario


class TestGetCommentAuthorScenario(unittest.TestCase):

    CREATE_USERS = (
        "CREATE TABLE users ("
        "id INTEGER PRIMARY KEY, email TEXT, username TEXT, "
        "password TEXT, avatar TEXT, bio TEXT, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    )
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

    def _make_db(self, tmp_dir, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(self.CREATE_USERS)
        conn.execute(self.CREATE_VIDEOS)
        conn.execute(self.CREATE_COMMENTS)
        return conn, db_path

    def _make_scenario(self, **kwargs):
        with patch.object(GetCommentAuthorScenario, "__init__", lambda self, *a, **kw: None):
            scenario = GetCommentAuthorScenario.__new__(GetCommentAuthorScenario)
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

    def test_most_recent_author(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute("INSERT INTO users (id, username) VALUES (1, 'alice')")
            conn.execute("INSERT INTO users (id, username) VALUES (2, 'bob')")
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Old one', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7776, 9999, 2, NULL, 'New one', 'visible', '2026-02-15 14:30:00.000')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                title="Test Video",
                order="most recent",
                agent_answer="The comment was made by bob.",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_oldest_author(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute("INSERT INTO users (id, username) VALUES (1, 'alice')")
            conn.execute("INSERT INTO users (id, username) VALUES (2, 'bob')")
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Old one', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7776, 9999, 2, NULL, 'New one', 'visible', '2026-02-15 14:30:00.000')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                title="Test Video",
                order="oldest",
                agent_answer="alice posted it.",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_author_fails(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute("INSERT INTO users (id, username) VALUES (1, 'alice')")
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Comment', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                title="Test Video",
                order="most recent",
                agent_answer="bob wrote it.",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_no_comments_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                title="Test Video",
                order="most recent",
                agent_answer="nobody",
            )
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_ignores_replies(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute("INSERT INTO users (id, username) VALUES (1, 'alice')")
            conn.execute("INSERT INTO users (id, username) VALUES (2, 'bob')")
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Top-level', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7776, 9999, 2, 7777, 'Reply', 'visible', '2026-03-01 12:00:00.000')"
            )
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                title="Test Video",
                order="most recent",
                agent_answer="alice",
            )
            self._setup_execute(scenario, d)
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
