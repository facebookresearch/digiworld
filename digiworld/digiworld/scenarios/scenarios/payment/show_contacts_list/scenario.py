# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ShowContactsListScenario(PaymentScenario, ComposableScenario):
    """Verify the user navigated to the contacts list screen."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(
                f"rootstore.json not found at {rootstore_path}"
            )

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            return {"on_contacts_screen": False}

        screen_name = current_session.get("data", {}).get("screenName", "")
        route = current_session.get("data", {}).get("route", "")

        on_contacts = (
            "contacts" in screen_name.lower()
            and "/(tabs)/contacts" in route
        )

        logger.info(
            "on_contacts_screen: screenName=%s, route=%s, result=%s",
            screen_name, route, on_contacts,
        )
        return {"on_contacts_screen": on_contacts}
