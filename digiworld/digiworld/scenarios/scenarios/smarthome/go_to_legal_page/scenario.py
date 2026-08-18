# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

PAGE_SCREEN_MAP = {
    "terms & conditions": {"screenName": "Terms", "route": "/terms"},
    "privacy policy": {"screenName": "Privacy", "route": "/privacy"},
}


class GoToLegalPageScenario(SmartHomeScenario, ComposableScenario):
    """Verify that the agent navigated to the correct legal page."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            raise ValueError("No current session found in rootstore")

        data = current_session.get("data", {})
        screen_name = data.get("screenName", "")
        route = data.get("route", "")

        page_info = PAGE_SCREEN_MAP.get(self.page_name.lower())
        if page_info is None:
            raise ValueError(
                f"Unknown page {self.page_name!r}. "
                f"Supported: {list(PAGE_SCREEN_MAP.keys())}"
            )

        expected_screen = page_info["screenName"]
        expected_route = page_info["route"]

        navigated = screen_name == expected_screen or route == expected_route
        logger.info(
            f"Navigation check: page={self.page_name!r}, screen={screen_name!r}, "
            f"route={route!r}, expected_screen={expected_screen!r}, "
            f"expected_route={expected_route!r}, result={navigated}"
        )

        return {"navigated_to_legal_page": navigated}
