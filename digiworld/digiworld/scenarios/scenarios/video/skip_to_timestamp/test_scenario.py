# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for SkipToTimestampScenario verification logic."""

import json
import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock, patch

from .scenario import SkipToTimestampScenario, PROGRESS_TOLERANCE_SECONDS


class TestSkipToTimestampScenario(unittest.TestCase):

    CREATE_VIDEOS = (
        "CREATE TABLE videos ("
        "id INTEGER PRIMARY KEY, channel_id INTEGER, title TEXT, "
        "description TEXT, video_url TEXT, category_id INTEGER, "
        "thumbnail_url TEXT, duration INTEGER, visibility TEXT, "
        "status TEXT, view_count INTEGER, like_count INTEGER, "
        "comment_count INTEGER, is_comments_enabled INTEGER, "
        "created_at TEXT, updated_at TEXT, deleted_at TEXT)"
    )

    def _make_db(self, tmp_dir, db_name="default.db"):
        db_path = os.path.join(tmp_dir, db_name)
        conn = sqlite3.connect(db_path)
        conn.execute(self.CREATE_VIDEOS)
        return conn, db_path

    def _write_rootstore(self, state_dir, current_video_id, progress):
        os.makedirs(state_dir, exist_ok=True)
        rootstore = {
            "videoStore": {
                "playbackState": {
                    "currentVideoId": current_video_id,
                    "isPlaying": True,
                    "progress": progress,
                    "duration": 3600,
                },
            },
        }
        with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
            json.dump(rootstore, f)

    def _make_scenario(self, **kwargs):
        with patch.object(SkipToTimestampScenario, "__init__", lambda self, *a, **kw: None):
            scenario = SkipToTimestampScenario.__new__(SkipToTimestampScenario)
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

    def test_correct_skip_passes(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            self._make_db(final_dir)
            self._write_rootstore(final_dir, 9999, 300)

            scenario = self._make_scenario(
                title="Test Video",
                minutes="5",
                agent_answer="",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["correct_video"])
            self.assertTrue(checks["progress_correct"])

    def test_within_tolerance_passes(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            self._make_db(final_dir)
            self._write_rootstore(final_dir, 9999, 330)

            scenario = self._make_scenario(
                title="Test Video",
                minutes="5",
                agent_answer="",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["progress_correct"])

    def test_outside_tolerance_fails(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            self._make_db(final_dir)
            target = 5 * 60
            self._write_rootstore(final_dir, 9999, target + PROGRESS_TOLERANCE_SECONDS + 10)

            scenario = self._make_scenario(
                title="Test Video",
                minutes="5",
                agent_answer="",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["progress_correct"])

    def test_wrong_video_fails(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            self._make_db(final_dir)
            self._write_rootstore(final_dir, 1234, 300)

            scenario = self._make_scenario(
                title="Test Video",
                minutes="5",
                agent_answer="",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertFalse(checks["correct_video"])

    def test_no_video_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.commit()
            conn.close()
            self._write_rootstore(d, 9999, 300)

            scenario = self._make_scenario(
                title="Nonexistent",
                minutes="5",
                agent_answer="",
            )
            self._setup_execute(scenario, d)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_missing_rootstore_raises(self):
        with tempfile.TemporaryDirectory() as d:
            conn, _ = self._make_db(d)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            scenario = self._make_scenario(
                title="Test Video",
                minutes="5",
                agent_answer="",
            )
            self._setup_execute(scenario, d)
            rootstore_path = os.path.join(d, "rootstore.json")
            if os.path.exists(rootstore_path):
                os.remove(rootstore_path)
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_10_minutes_exact(self):
        with tempfile.TemporaryDirectory() as initial_dir, \
             tempfile.TemporaryDirectory() as final_dir:
            conn, _ = self._make_db(initial_dir)
            conn.execute("INSERT INTO videos (id, channel_id, title, status) VALUES (9999, 1, 'Test Video', 'active')")
            conn.commit()
            conn.close()

            self._make_db(final_dir)
            self._write_rootstore(final_dir, 9999, 600)

            scenario = self._make_scenario(
                title="Test Video",
                minutes="10",
                agent_answer="",
            )
            self._setup_execute(scenario, initial_dir)
            checks = scenario._get_checks(final_dir)
            self.assertTrue(checks["correct_video"])
            self.assertTrue(checks["progress_correct"])


if __name__ == "__main__":
    unittest.main()
