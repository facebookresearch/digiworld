"""Composed scenario: navigate to a page, then report support contact info."""

import json
import os

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.scenarios.ryde.shared import PAGE_MAP
from digiworld.scenarios.verification import ComposableScenario

_SUPPORT_INFO = {
    "number": "1-800-RYDE",
    "email": "support@ryde.com",
}


class NavigateToPageAndCheckSupportScenario(RydeScenario, ComposableScenario):
    """Verify the user navigated to the requested page and the agent reports support info."""

    def _get_checks(self, state_path):
        # --- Navigation checks (from navigate_to_page) ---
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            on_correct_page = False
        else:
            page_info = PAGE_MAP.get(self.page_name.lower())
            if not page_info:
                raise ValueError(f"Unknown page_name: {self.page_name}")

            screen_name = current_session.get('data', {}).get('screenName', '')
            route = current_session.get('data', {}).get('route', '')

            on_correct_page = (
                screen_name == page_info["screen_name"]
                and route == page_info["route"]
            )

        # --- Support contact check (from support_contact_info) ---
        expected = _SUPPORT_INFO.get(self.info_type.lower())
        if not expected:
            raise ValueError(f"Unknown info_type: {self.info_type}")

        return {
            "on_correct_page": on_correct_page,
            "answer_matches": substring_match(self.agent_answer, expected),
        }
