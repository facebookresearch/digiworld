# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

PAGE_ROUTE_KEYWORDS = {
    "terms & conditions": "terms",
    "privacy policy": "privacy",
}


class NavigateToLegalScenario(VideoScenario, ComposableScenario):
    """Verify that the agent navigated to the correct legal page."""

    def _get_checks(self, state_path):
        route_matches = self._check_route(state_path)
        return {
            "navigated_correctly": route_matches,
        }

    def _check_route(self, state_path) -> bool:
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            raise ValueError("No current session found in rootstore")

        data = current_session.get("data", {})
        route = data.get("route", "").lower()
        screen_name = data.get("screenName", "").lower()

        keyword = PAGE_ROUTE_KEYWORDS.get(self.page.lower())
        if keyword is None:
            raise ValueError(
                f"Unknown page {self.page!r}. "
                f"Supported: {list(PAGE_ROUTE_KEYWORDS.keys())}"
            )

        result = keyword in route or keyword in screen_name
        logger.info(
            f"Navigation check: page={self.page!r}, route={route!r}, "
            f"screen={screen_name!r}, keyword={keyword!r}, result={result}"
        )
        return result
