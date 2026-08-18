# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario

_SETTING_MAP = {
    "dark mode": "isDarkMode",
    "notifications": "notificationsEnabled",
}


class ToggleSettingScenario(EcommerceScenario, ComposableScenario):
    """Scenario for toggling a user setting (Dark Mode / Notifications)."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError("rootstore.json not found")

        with open(rootstore_path) as f:
            rootstore = json.load(f)

        session = self.get_current_session(rootstore)
        if not session:
            raise ValueError("No current session")

        form_data = (
            session.get("data", {})
            .get("sessionData", {})
            .get("formData", {})
        )

        setting_key = _SETTING_MAP.get(self.setting.lower())
        if not setting_key:
            raise ValueError(f"Unknown setting: {self.setting}")

        expected_value = self.action.lower() == "enable"
        actual_value = form_data.get(setting_key)

        return {"setting_toggled": actual_value == expected_value}
