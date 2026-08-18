# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.scenarios.video.shared import FEED_NAME_TO_ID
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class NavigateToFirstFeedVideoScenario(VideoScenario, ComposableScenario):
    """Verify that the agent navigated to and is playing the first video
    from a specific recommendation feed on the homepage."""

    def _get_checks(self, state_path):
        expected_video_id = self._get_expected_video_id()

        current_video_id = self._get_current_video_id(state_path)
        playing = current_video_id is not None and current_video_id == expected_video_id

        # Also accept if the agent navigated to the video page without
        # playback (e.g. tapped the video but the player didn't auto-start).
        on_video_page = False
        if not playing:
            on_video_page = self._is_on_video_page(state_path, expected_video_id)

        matches = playing or on_video_page
        logger.info(
            "Expected video_id=%s, current=%s, playing=%s, on_page=%s",
            expected_video_id, current_video_id, playing, on_video_page,
        )
        return {"correct_video_playing": matches}

    def _is_on_video_page(self, state_path, expected_video_id):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)
        session = self.get_current_session(rootstore)
        if not session:
            return False
        route = session.get("data", {}).get("route", "")
        return f"/video/{expected_video_id}" in route or f"videoId={expected_video_id}" in route

    def _get_expected_video_id(self):
        rootstore_path = os.path.join(self.initial_state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(
                f"rootstore.json not found at {self.initial_state_path}"
            )
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        feeds = rootstore.get("videoStore", {}).get("recommendationFeeds", [])
        feed = self._find_feed(feeds)
        if feed is None:
            raise ValueError(
                f"Feed {self.feed_name!r} not found in recommendationFeeds"
            )

        videos = feed.get("videos", [])
        if not videos:
            raise ValueError(
                f"Feed {self.feed_name!r} has no videos"
            )
        return videos[0]["id"]

    def _find_feed(self, feeds):
        feed_id = FEED_NAME_TO_ID.get(self.feed_name)

        if feed_id is not None:
            for feed in feeds:
                if feed.get("id") == feed_id:
                    return feed
            return None

        # "popular in music" / "popular in gaming" -- match by title substring
        keyword = self.feed_name.replace("popular in ", "")
        for feed in feeds:
            if keyword.lower() in feed.get("title", "").lower():
                return feed
        return None

    def _get_current_video_id(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return None
        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)
        playback = rootstore.get("videoStore", {}).get("playbackState", {})
        return playback.get("currentVideoId")
