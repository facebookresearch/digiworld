# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import TargetStateScenario

logger = logging.getLogger(__name__)


class TurnOnNotificationsScenario(QwikshopScenario, TargetStateScenario):
    """Scenario that verifies the user turned notifications on."""

    def _check_task_completion(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        if not current_session:
            raise ValueError("No current session found in rootstore")

        route = current_session.get("data", {}).get("route", "")
        if "profile" not in route.lower():
            logger.info("Not on profile screen, route=%s", route)
            return False

        form_data = (
            current_session.get("data", {})
            .get("sessionData", {})
            .get("formData", {})
        )

        notifications_enabled = form_data.get("notificationsEnabled")
        if notifications_enabled is None:
            raise ValueError("notificationsEnabled not found in formData")

        logger.info("notificationsEnabled=%s", notifications_enabled)
        return notifications_enabled == "true"
