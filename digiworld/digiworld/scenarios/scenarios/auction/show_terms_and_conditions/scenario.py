# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
import json
import os


class ShowTermsAndConditionsScenario(AuctionScenario, TargetStateScenario):
    """Scenario for navigating to the terms and conditions page."""

    def _check_task_completion(self, state_path):
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

        return screen_name == "Terms" or route == "/terms"
