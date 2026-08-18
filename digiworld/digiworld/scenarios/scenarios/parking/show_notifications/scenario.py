# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario
import json
import os


class ShowNotificationsScenario(ParkingScenario, ComposableScenario):
    """Scenario for navigating to the notifications screen."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {state_path}")

        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            raise ValueError("No current session found in rootstore")

        screen_name = current_session.get('data', {}).get('screenName', '').lower()
        route = current_session.get('data', {}).get('route', '').lower()

        navigated = screen_name == 'notifications' or '/notifications' in route

        return {"navigated_to_notifications": navigated}
