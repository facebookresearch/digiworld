# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for NavigateToFirstFeedVideoScenario."""

import json
import os
import tempfile
import unittest

from .scenario import NavigateToFirstFeedVideoScenario


def _write_rootstore(state_dir, feeds, playback_video_id=None):
    os.makedirs(state_dir, exist_ok=True)
    rootstore = {
        "videoStore": {
            "recommendationFeeds": feeds,
            "playbackState": {
                "currentVideoId": playback_video_id,
                "isPlaying": True,
                "progress": 0,
                "duration": 300,
            },
        },
    }
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


SAMPLE_FEEDS = [
    {
        "id": "recommended-for-you",
        "title": "Recommended For You",
        "videos": [{"id": 101}, {"id": 102}],
    },
    {
        "id": "similar-watched",
        "title": "Similar To What You Watched",
        "videos": [{"id": 201}, {"id": 202}],
    },
    {
        "id": "in-your-orbit",
        "title": "In Your Orbit",
        "videos": [{"id": 301}],
    },
    {
        "id": "in-your-zone",
        "title": "In Your Zone",
        "videos": [{"id": 401}],
    },
    {
        "id": "popular-music",
        "title": "Popular in Music",
        "videos": [{"id": 501}, {"id": 502}],
    },
    {
        "id": "popular-gaming",
        "title": "Popular in Gaming",
        "videos": [{"id": 601}],
    },
]


class _StubScenario(NavigateToFirstFeedVideoScenario):
    def __init__(self):
        pass


class TestNavigateToFirstFeedVideo(unittest.TestCase):

    def _make_scenario(self, feed_name):
        scenario = _StubScenario()
        scenario.feed_name = feed_name
        return scenario

    def test_recommended_for_me_pass(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=101)
            scenario = self._make_scenario("recommended for me")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_similar_watched_pass(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=201)
            scenario = self._make_scenario("similar to what I watched")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_in_my_orbit_pass(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=301)
            scenario = self._make_scenario("in my orbit")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_in_my_zone_pass(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=401)
            scenario = self._make_scenario("in my zone")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_popular_in_music_pass(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=501)
            scenario = self._make_scenario("popular in music")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_popular_in_gaming_pass(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=601)
            scenario = self._make_scenario("popular in gaming")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertTrue(checks["correct_video_playing"])

    def test_wrong_video_fails(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=999)
            scenario = self._make_scenario("recommended for me")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertFalse(checks["correct_video_playing"])

    def test_no_video_playing_fails(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=None)
            scenario = self._make_scenario("recommended for me")
            scenario.initial_state_path = initial
            checks = scenario._get_checks(final)
            self.assertFalse(checks["correct_video_playing"])

    def test_unknown_feed_raises(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, SAMPLE_FEEDS)
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=101)
            scenario = self._make_scenario("nonexistent feed")
            scenario.initial_state_path = initial
            with self.assertRaises(ValueError):
                scenario._get_checks(final)

    def test_missing_initial_rootstore_raises(self):
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(final, SAMPLE_FEEDS, playback_video_id=101)
            scenario = self._make_scenario("recommended for me")
            scenario.initial_state_path = initial
            with self.assertRaises(ValueError):
                scenario._get_checks(final)

    def test_empty_feed_videos_raises(self):
        empty_feeds = [
            {"id": "recommended-for-you", "title": "Recommended For You", "videos": []},
        ]
        with tempfile.TemporaryDirectory() as initial, tempfile.TemporaryDirectory() as final:
            _write_rootstore(initial, empty_feeds)
            _write_rootstore(final, empty_feeds, playback_video_id=101)
            scenario = self._make_scenario("recommended for me")
            scenario.initial_state_path = initial
            with self.assertRaises(ValueError):
                scenario._get_checks(final)


if __name__ == "__main__":
    unittest.main()
