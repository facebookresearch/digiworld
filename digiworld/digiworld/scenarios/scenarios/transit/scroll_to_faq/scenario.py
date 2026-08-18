# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for navigating to the Help page to find an FAQ answer."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.transit.shared import FAQ_TOPICS

logger = logging.getLogger(__name__)


class ScrollToFaqScenario(TransitScenario, ComposableScenario):
    """Verify the user navigated to the Help page for an FAQ topic.

    Scroll position cannot be verified from rootstore state, so only
    navigation to the help screen is checked.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        faq_topic = getattr(self, "faq_topic", None)
        if not faq_topic:
            raise ValueError("faq_topic parameter is required")

        if faq_topic.lower() not in [t.lower() for t in FAQ_TOPICS]:
            raise ValueError(
                f"Unknown faq_topic '{faq_topic}'. "
                f"Valid topics: {FAQ_TOPICS}"
            )

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {"on_help_page": False}

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_help_page": False}

        screen_name = current_session.get("data", {}).get("screenName", "").lower()
        route = current_session.get("data", {}).get("route", "").lower()

        on_help = "help" in screen_name or "/help" in route

        logger.info(
            "Help page: %s (screenName='%s', route='%s'), faq_topic='%s'",
            on_help, screen_name, route, faq_topic,
        )
        return {"on_help_page": on_help}
