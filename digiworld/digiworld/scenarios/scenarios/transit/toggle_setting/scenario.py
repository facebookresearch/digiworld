# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

SETTING_TO_KEY = {
    "push notifications": "notificationsEnabled",
    "location services": "locationEnabled",
}


class ToggleSettingScenario(TransitScenario, ComposableScenario):
    """Verify that a profile setting has been toggled to the expected state.

    Checks the final rootstore to confirm the setting value matches the
    requested action *and* differs from the initial state, so a no-op
    cannot produce a false-positive pass.
    """

    def _get_checks(self, state_path):
        key = SETTING_TO_KEY.get(self.setting)
        if key is None:
            raise ValueError(
                f"Unknown setting '{self.setting}'. "
                f"Expected one of: {list(SETTING_TO_KEY.keys())}"
            )

        expected = self.action.strip().lower() == "enable"

        final_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(final_path):
            raise ValueError(f"rootstore.json not found at {final_path}")
        with open(final_path, "r") as f:
            final_rootstore = json.load(f)

        final_value = (
            final_rootstore
            .get("profileStore", {})
            .get("profileState", {})
            .get(key)
        )

        matches = final_value is expected or final_value == expected

        initial_path = os.path.join(self.initial_state_path, "rootstore.json")
        if os.path.exists(initial_path):
            with open(initial_path, "r") as f:
                init_rootstore = json.load(f)
            initial_value = (
                init_rootstore
                .get("profileStore", {})
                .get("profileState", {})
                .get(key)
            )
            if initial_value == expected:
                logger.warning(
                    "Initial state already has %s=%s; the task is a no-op. "
                    "Marking as failed to avoid false-positive.",
                    key, initial_value,
                )
                matches = False

        logger.info(
            f"Toggle setting check: action='{self.action}', "
            f"setting='{self.setting}', key='{key}', "
            f"expected={expected}, final={final_value}, matches={matches}"
        )

        return {"setting_matches": matches}
