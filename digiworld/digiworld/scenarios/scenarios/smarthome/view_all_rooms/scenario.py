# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ViewAllRoomsScenario(SmartHomeScenario, ComposableScenario):
    """Verify that the agent navigated to the rooms screen."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            raise ValueError("No current session found in rootstore")

        data = current_session.get("data", {})
        screen_name = data.get("screenName", "")
        route = data.get("route", "")

        navigated = screen_name == "rooms" or route == "/rooms"
        logger.info(
            f"Navigation check: screen={screen_name!r}, route={route!r}, "
            f"result={navigated}"
        )

        return {"navigated_to_rooms": navigated}
