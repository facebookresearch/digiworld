# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class LoginWithPhoneOtpScenario(PaymentScenario, ComposableScenario):
    """Verify the user completed the phone+OTP login flow and landed on home."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {state_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)
        session_data = (current_session or {}).get("data", {})

        screen_name = session_data.get("screenName", "")
        route = session_data.get("route", "")
        on_home_screen = (
            screen_name.lower() == "home" and "/(tabs)/home" in route
        )

        current_user = rootstore.get("userStore", {}).get("currentUser")
        user_logged_in = (
            current_user is not None
            and current_user.get("id") not in (None, "")
        )

        logger.info(
            "Login checks: screenName=%r, route=%r, on_home=%s, logged_in=%s",
            screen_name, route, on_home_screen, user_logged_in,
        )

        return {
            "on_home_screen": on_home_screen,
            "user_logged_in": user_logged_in,
        }
