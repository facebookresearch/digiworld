# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

CATEGORY_SCREEN_MAP = {
    "devices": {"screen_name": "devices", "route": "/devices"},
    "automations": {"screen_name": "automations", "route": "/automations"},
    "notifications": {"screen_name": "notifications", "route": "/notifications"},
}


class ViewAllCategoryScenario(SmartHomeScenario, ComposableScenario):
    """Verify the user navigated to the correct category screen."""

    def _get_checks(self, state_path):
        category = getattr(self, "category", None)
        if not category:
            raise ValueError("category parameter is required")

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_correct_screen": False}

        page_info = CATEGORY_SCREEN_MAP.get(category.lower())
        if not page_info:
            raise ValueError(f"Unknown category: {category!r}")

        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')

        return {
            "on_correct_screen": (
                screen_name == page_info["screen_name"]
                or route == page_info["route"]
            ),
        }
