# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import TargetStateScenario


class ComposeNewEmail(EmailScenario, TargetStateScenario):
    """Verify that the user navigated to the compose email screen."""

    def _check_task_completion(self, state_path: str) -> bool:
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False

        screen_name = current_session.get("data", {}).get("screenName", "")
        route = current_session.get("data", {}).get("route", "")
        return "compose" in screen_name.lower() and "compose" in route.lower()
