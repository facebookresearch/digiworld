# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SignOutScenario(PaymentScenario, ComposableScenario):
    """Verify the user signed out and is on the login screen."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(
                f"rootstore.json not found at {rootstore_path}"
            )

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        current_session = self.get_current_session(rootstore)

        on_login = False
        if current_session:
            screen_name = current_session.get("data", {}).get("screenName", "").lower()
            route = current_session.get("data", {}).get("route", "")

            on_phone_login = (
                screen_name == "phonelogin"
                and "/screens/auth/phone-login" in route
            )
            on_users_list = (
                screen_name == "userslist"
                and "/screens/auth/users-list" in route
            )
            on_login = on_phone_login or on_users_list

        current_user = rootstore.get("userStore", {}).get("currentUser")
        user_cleared = current_user is None or current_user == {}

        signed_out = on_login or user_cleared

        logger.info(
            "on_login=%s, user_cleared=%s, signed_out=%s",
            on_login, user_cleared, signed_out,
        )
        return {"signed_out": signed_out}
