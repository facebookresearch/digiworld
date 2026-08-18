# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ReplyToCommentScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import ReplyToCommentScenario


class TestReplyToCommentScenario(unittest.TestCase):

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
        conn.execute(self.CREATE_VIDEOS)
        conn.execute(self.CREATE_COMMENTS)
        return conn, db_path

    def _make_scenario(self, **kwargs):
        with patch.object(ReplyToCommentScenario, "__init__", lambda self, *a, **kw: None):
            scenario = ReplyToCommentScenario.__new__(ReplyToCommentScenario)
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

    def test_reply_posted_passes(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original comment', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.commit()
            conn.close()

            conn2, _ = self._make_db(final_dir)
            conn2.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn2.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original comment', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn2.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7778, 9999, 1, 7777, 'Great point!', 'visible', '2026-02-20 12:00:00.000')"
            )
            conn2.commit()
            conn2.close()

            scenario = self._make_scenario(
                title="Test Video",
                reply_text="Great point!",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["reply_posted"])

    def test_no_reply_fails(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original comment', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.commit()
            conn.close()

            conn2, _ = self._make_db(final_dir)
            conn2.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn2.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original comment', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn2.commit()
            conn2.close()

            scenario = self._make_scenario(
                title="Test Video",
                reply_text="Great point!",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["reply_posted"])

    def test_wrong_reply_text_fails(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.commit()
            conn.close()

            conn2, _ = self._make_db(final_dir)
            conn2.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn2.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn2.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7778, 9999, 1, 7777, 'Wrong reply', 'visible', '2026-02-20 12:00:00.000')"
            )
            conn2.commit()
            conn2.close()

            scenario = self._make_scenario(
                title="Test Video",
                reply_text="Great point!",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["reply_posted"])

    def test_no_comments_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            scenario = self._make_scenario(title="Test Video", reply_text="Reply")
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_case_insensitive_reply_match(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn.commit()
            conn.close()

            conn2, _ = self._make_db(final_dir)
            conn2.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn2.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7777, 9999, 1, NULL, 'Original', 'visible', '2026-01-10 08:00:00.000')"
            )
            conn2.execute(
                "INSERT INTO comments (id, video_id, user_id, parent_id, content, status, created_at) "
                "VALUES (7778, 9999, 1, 7777, 'GREAT POINT!', 'visible', '2026-02-20 12:00:00.000')"
            )
            conn2.commit()
            conn2.close()

            scenario = self._make_scenario(
                title="Test Video",
                reply_text="great point!",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["reply_posted"])


if __name__ == "__main__":
    unittest.main()
