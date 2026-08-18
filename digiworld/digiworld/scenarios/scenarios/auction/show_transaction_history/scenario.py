# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import TargetStateScenario


class ShowTransactionHistoryScenario(AuctionScenario, TargetStateScenario):
    """Verify that the agent navigated to the transaction history screen
    with the correct transaction-type filter applied."""

    def _check_task_completion(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False

        screen_name = current_session.get("data", {}).get("screenName", "").lower()
        route = current_session.get("data", {}).get("route", "").lower()

        on_history_screen = "transaction" in screen_name or "/history" in route
        if not on_history_screen:
            return False

        active_filter = (
            rootstore.get("uiStore", {})
            .get("transactionFilter", {})
            .get("activeFilter", "all")
        )

        expected = self.transactionType
        return active_filter == expected
