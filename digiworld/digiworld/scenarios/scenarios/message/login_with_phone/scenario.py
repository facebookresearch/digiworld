# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class LoginWithPhoneScenario(MessageScenario, ComposableScenario):
    """Verify that the user logged out and back in with the correct phone number."""

    def _get_expected_phone(self):
        phone_query = "SELECT phone_number FROM users WHERE id = ?"
        phone_rows = self._execute_query_in_path(
            phone_query, (self.current_user_id,), self.initial_state_path
        )
        if not phone_rows:
            raise ValueError(
                f"No phone_number found for user_id={self.current_user_id}"
            )
        return phone_rows[0][0]

    def _get_rootstore_login_timestamp(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if os.path.exists(rootstore_path):
            try:
                with open(rootstore_path, "r") as f:
                    rootstore = json.load(f)
                current_user = rootstore.get("userStore", {}).get("currentUser", {})
                last_logged_in = current_user.get("lastLoggedIn")
                if last_logged_in is not None:
                    return last_logged_in
            except Exception:
                pass
        return None

    def _get_db_login_timestamp(self, state_path):
        query = "SELECT last_logged_in FROM users WHERE id = ?"
        rows = self._execute_query_in_path(query, (self.current_user_id,), state_path)
        if not rows:
            raise ValueError(
                f"User {self.current_user_id} not found in users table"
            )
        return rows[0][0]

    def _get_checks(self, state_path):
        expected_phone = self._get_expected_phone()

        # --- Precondition: user must NOT already be logged in initially ---
        initial_rootstore_path = os.path.join(
            self.initial_state_path, "rootstore.json"
        )
        not_already_logged_in = True
        if os.path.exists(initial_rootstore_path):
            with open(initial_rootstore_path, "r") as f:
                initial_rootstore = json.load(f)
            initial_user_store = initial_rootstore.get("userStore", {})
            initial_current_user = initial_user_store.get("currentUser", {})
            initial_phone = initial_current_user.get("phoneNumber", "")
            not_already_logged_in = initial_phone != expected_phone
            if not not_already_logged_in:
                logger.warning(
                    "User was already logged in with phone '%s' in "
                    "initial state — vacuous truth",
                    expected_phone,
                )

        # --- fresh_login: support both signals used across app/test flows.
        initial_rootstore_ts = self._get_rootstore_login_timestamp(self.initial_state_path)
        final_rootstore_ts = self._get_rootstore_login_timestamp(state_path)
        initial_db_ts = self._get_db_login_timestamp(self.initial_state_path)
        final_db_ts = self._get_db_login_timestamp(state_path)

        rootstore_changed = (
            initial_rootstore_ts is not None
            and final_rootstore_ts is not None
            and initial_rootstore_ts != final_rootstore_ts
        )
        db_changed = initial_db_ts != final_db_ts
        fresh_login = rootstore_changed or db_changed
        logger.info(
            "fresh_login: initial_rootstore_ts=%s, final_rootstore_ts=%s, "
            "initial_db_ts=%s, final_db_ts=%s, changed=%s",
            initial_rootstore_ts, final_rootstore_ts, initial_db_ts, final_db_ts, fresh_login,
        )

        # --- correct_user: rootstore phone matches expected ---
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {
                "not_already_logged_in": not_already_logged_in,
                "fresh_login": fresh_login,
                "correct_user": False,
            }

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        user_store = rootstore.get("userStore", {})
        current_user = user_store.get("currentUser", {})
        actual_phone = current_user.get("phoneNumber", "")

        correct_user = actual_phone == expected_phone
        logger.info(
            "correct_user: expected=%s, actual=%s, match=%s",
            expected_phone, actual_phone, correct_user,
        )

        return {
            "not_already_logged_in": not_already_logged_in or fresh_login,
            "fresh_login": fresh_login,
            "correct_user": correct_user,
        }