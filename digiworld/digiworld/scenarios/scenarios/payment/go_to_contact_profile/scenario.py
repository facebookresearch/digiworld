# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario


class GoToContactProfileScenario(PaymentScenario, ComposableScenario):
    """Verify the user navigated to the specified contact's profile page."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {state_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_contact_detail_screen": False}

        screen_name = current_session.get("data", {}).get("screenName", "")
        route = current_session.get("data", {}).get("route", "")

        on_contact_detail = (
            ("contact" in route.lower() or "profile" in route.lower())
            and ("contact" in screen_name.lower() or "profile" in screen_name.lower())
        )

        return {"on_contact_detail_screen": on_contact_detail}
