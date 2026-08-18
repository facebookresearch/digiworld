# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Tests for ScrollToFaqScenario verification logic."""

import json
import os
import tempfile
import unittest

from digiworld.scenarios.scenarios.transit.scroll_to_faq.scenario import (
    ScrollToFaqScenario,
)


def _write_rootstore(state_dir, rootstore):
    os.makedirs(state_dir, exist_ok=True)
    with open(os.path.join(state_dir, "rootstore.json"), "w") as f:
        json.dump(rootstore, f)


class _StubScenario(ScrollToFaqScenario):
    def __init__(self):
        pass


def _make_rootstore(screen_name, route):
    return {
        "sessionStore": {
            "session": {
                "data": {
                    "screenName": screen_name,
                    "route": route,
                }
            }
        },
    }


class TestScrollToFaq(unittest.TestCase):
    def setUp(self):
        self.tmpdir = tempfile.mkdtemp()
        self.state_dir = os.path.join(self.tmpdir, "state")
        self.scenario = _StubScenario()
        self.scenario.agent_answer = ""

    def test_on_help_page_passes(self):
        rootstore = _make_rootstore("Help", "/help")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.faq_topic = "plan a trip"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_help_page"])

    def test_help_in_screen_name_passes(self):
        rootstore = _make_rootstore("HelpCenter", "/help-center")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.faq_topic = "service alerts"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertTrue(checks["on_help_page"])

    def test_wrong_screen_fails(self):
        rootstore = _make_rootstore("Home", "/home")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.faq_topic = "find nearby stops"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_help_page"])

    def test_missing_rootstore_fails(self):
        os.makedirs(self.state_dir, exist_ok=True)
        self.scenario.faq_topic = "plan a trip"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_help_page"])

    def test_missing_faq_topic_raises(self):
        rootstore = _make_rootstore("Help", "/help")
        _write_rootstore(self.state_dir, rootstore)
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_invalid_faq_topic_raises(self):
        rootstore = _make_rootstore("Help", "/help")
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.faq_topic = "nonexistent topic"
        with self.assertRaises(ValueError):
            self.scenario._get_checks(self.state_dir)

    def test_all_valid_topics_pass(self):
        from digiworld.scenarios.scenarios.transit.shared import FAQ_TOPICS

        rootstore = _make_rootstore("Help", "/help")
        _write_rootstore(self.state_dir, rootstore)
        for topic in FAQ_TOPICS:
            self.scenario.faq_topic = topic
            checks = self.scenario._get_checks(self.state_dir)
            self.assertTrue(checks["on_help_page"], f"Failed for topic: {topic}")

    def test_no_session_fails(self):
        rootstore = {"sessionStore": {}}
        _write_rootstore(self.state_dir, rootstore)
        self.scenario.faq_topic = "plan a trip"
        checks = self.scenario._get_checks(self.state_dir)
        self.assertFalse(checks["on_help_page"])


if __name__ == "__main__":
    unittest.main()
