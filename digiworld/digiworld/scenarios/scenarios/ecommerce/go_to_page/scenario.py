# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class GoToPageScenario(EcommerceScenario, TargetStateScenario):
    """Scenario for navigating to a specific page in the ecommerce app."""

    PAGE_PATTERNS = {
        "home": (["home"], ["/home", "/(tabs)/home"]),
        "address book": (["address"], ["/address"]),
        "payment methods": (["payment"], ["/payment"]),
        "my orders": (["order"], ["/order"]),
        "profile": (["profile"], ["/profile"]),
        "categories": (["categor"], ["/categor"]),
        "cart": (["cart"], ["/cart"]),
    }

    def _check_task_completion(self, state_path):
        import json
        import os

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        session = self.get_current_session(rootstore)
        if not session:
            return False

        screen = session.get("data", {}).get("screenName", "").lower()
        route = session.get("data", {}).get("route", "").lower()
        target = self.page.lower()

        patterns = self.PAGE_PATTERNS.get(target)
        if not patterns:
            return False

        screen_pats, route_pats = patterns
        screen_match = any(p in screen for p in screen_pats)
        route_match = any(p in route for p in route_pats)
        return screen_match or route_match
