# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ChangeProfileNameScenario(MessageScenario, ComposableScenario):
    """Verify that the user's profile name was changed to the requested value."""

    def _get_checks(self, state_path):
        new_name = getattr(self, "new_name", None)
        if not new_name:
            raise ValueError("new_name parameter is required")

        # Precondition: verify the name was different in the initial state
        initial_rows = self._execute_query_in_path(
            "SELECT name FROM users WHERE id = ?",
            (self.current_user_id,),
            self.initial_state_path,
        )
        if initial_rows:
            initial_name = initial_rows[0][0]
            name_was_different = (
                initial_name is None
                or initial_name.strip().lower() != new_name.strip().lower()
            )
        else:
            # No user row in initial state is unusual but counts as different
            name_was_different = True

        if not name_was_different:
            logger.warning(
                "Profile name was already '%s' in initial state — vacuous truth",
                new_name,
            )

        # Check the final state
        rows = self._execute_query_in_path(
            "SELECT name FROM users WHERE id = ?",
            (self.current_user_id,),
            state_path,
        )
        if not rows:
            raise ValueError(
                f"No user found with id {self.current_user_id} "
                f"in {state_path}"
            )

        db_name = rows[0][0]
        db_match = db_name is not None and db_name.strip().lower() == new_name.strip().lower()

        rootstore_match = False
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if os.path.exists(rootstore_path):
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)
            rs_name = (
                rootstore
                .get("userStore", {})
                .get("currentUser", {})
                .get("name", "")
            )
            rootstore_match = rs_name.strip().lower() == new_name.strip().lower()
        else:
            logger.warning("rootstore.json not found at %s, skipping rootstore check", state_path)
            rootstore_match = db_match

        return {
            "name_was_different": name_was_different,
            "name_changed": db_match and rootstore_match,
        }
