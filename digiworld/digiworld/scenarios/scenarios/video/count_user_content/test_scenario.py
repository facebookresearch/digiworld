# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for CountUserContentScenario verification logic."""

import os
import sqlite3
import tempfile
import unittest
from unittest.mock import MagicMock

from digiworld.scenarios.scenarios.video.count_user_content.scenario import (
    CountUserContentScenario,
)

SCHEMA_SQL = """
CREATE TABLE channels (
    id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT,
    description TEXT, banner TEXT, avatar TEXT, subscriber_count INTEGER,
    created_at TEXT, updated_at TEXT, deleted_at TEXT
);
CREATE TABLE videos (
    id INTEGER PRIMARY KEY, channel_id INTEGER, title TEXT,
    description TEXT, video_url TEXT, category_id INTEGER,
    thumbnail_url TEXT, duration INTEGER, visibility TEXT,
    status TEXT, view_count INTEGER, like_count INTEGER,
    comment_count INTEGER, is_comments_enabled INTEGER,
    created_at TEXT, updated_at TEXT, deleted_at TEXT
);
CREATE TABLE playlists (
    id INTEGER PRIMARY KEY, user_id INTEGER, name TEXT,
    description TEXT, is_public INTEGER, shuffle INTEGER,
    share_url TEXT, created_at TEXT, updated_at TEXT, deleted_at TEXT
);
"""


def _make_db(tmp_dir, channels, videos, playlists):
    db_path = os.path.join(tmp_dir, "default.db")
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA_SQL)
    for ch in channels:
        conn.execute(
            "INSERT INTO channels (id, user_id, name) VALUES (?, ?, ?)",
            (ch["id"], ch["user_id"], ch.get("name", "ch")),
        )
    for v in videos:
        conn.execute(
            "INSERT INTO videos (id, channel_id, title, status, view_count) "
            "VALUES (?, ?, ?, ?, ?)",
            (v["id"], v["channel_id"], v.get("title", "vid"),
             v.get("status", "active"), v.get("view_count", 0)),
        )
    for pl in playlists:
        conn.execute(
            "INSERT INTO playlists (id, user_id, name, deleted_at) "
            "VALUES (?, ?, ?, ?)",
            (pl["id"], pl["user_id"], pl.get("name", "pl"),
             pl.get("deleted_at", None)),
        )
    conn.commit()
    conn.close()


class _StubScenario(CountUserContentScenario):
    def __init__(self):
        pass


class TestCountUserContent(unittest.TestCase):

    @staticmethod
    def _execute_query_in_path(query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        result = conn.execute(query, params).fetchall()
        conn.close()
        return result

    def _make_scenario(self, metric, agent_answer=""):
        scenario = _StubScenario()
        scenario.metric = metric
        scenario.current_user_id = 1
        scenario.agent_answer = agent_answer
        scenario._state_manager = MagicMock()
        scenario._execute_query_in_path = self._execute_query_in_path
        return scenario

    def test_video_count_pass(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      channels=[{"id": 1, "user_id": 1}],
                      videos=[
                          {"id": 1, "channel_id": 1, "status": "active", "view_count": 10},
                          {"id": 2, "channel_id": 1, "status": "active", "view_count": 20},
                          {"id": 3, "channel_id": 1, "status": "deleted", "view_count": 5},
                      ],
                      playlists=[])
            scenario = self._make_scenario("videos", "You have 2 videos.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_playlist_count_pass(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      channels=[{"id": 1, "user_id": 1}],
                      videos=[],
                      playlists=[
                          {"id": 1, "user_id": 1},
                          {"id": 2, "user_id": 1, "deleted_at": "2026-01-01"},
                          {"id": 3, "user_id": 1},
                      ])
            scenario = self._make_scenario("playlists", "You have 2 playlists.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_total_views_pass(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      channels=[{"id": 1, "user_id": 1}],
                      videos=[
                          {"id": 1, "channel_id": 1, "status": "active", "view_count": 100},
                          {"id": 2, "channel_id": 1, "status": "active", "view_count": 250},
                      ],
                      playlists=[])
            scenario = self._make_scenario("total views", "You have 350 total views.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])

    def test_wrong_count_fails(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      channels=[{"id": 1, "user_id": 1}],
                      videos=[{"id": 1, "channel_id": 1, "status": "active", "view_count": 10}],
                      playlists=[])
            scenario = self._make_scenario("videos", "You have 5 videos.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertFalse(checks["answer_matches"])

    def test_unknown_metric_raises(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d, channels=[], videos=[], playlists=[])
            scenario = self._make_scenario("subscribers", "10")
            scenario.initial_state_path = d
            with self.assertRaises(ValueError):
                scenario._get_checks(d)

    def test_filters_by_user(self):
        with tempfile.TemporaryDirectory() as d:
            _make_db(d,
                      channels=[
                          {"id": 1, "user_id": 1},
                          {"id": 2, "user_id": 2},
                      ],
                      videos=[
                          {"id": 1, "channel_id": 1, "status": "active", "view_count": 10},
                          {"id": 2, "channel_id": 2, "status": "active", "view_count": 20},
                      ],
                      playlists=[])
            scenario = self._make_scenario("videos", "I have 1 video.")
            scenario.initial_state_path = d
            checks = scenario._get_checks(d)
            self.assertTrue(checks["answer_matches"])


if __name__ == "__main__":
    unittest.main()
