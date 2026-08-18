# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.scenarios.ryde.shared import PAGE_MAP


class NavigateToPageScenario(RydeScenario, ComposableScenario):
    """Verify the user navigated to the requested page in the Ryde app."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_correct_page": False}

        page_info = PAGE_MAP.get(self.page_name.lower())
        if not page_info:
            raise ValueError(f"Unknown page_name: {self.page_name}")

        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')

        return {
            "on_correct_page": (
                screen_name == page_info["screen_name"]
                and route == page_info["route"]
            )
        }
