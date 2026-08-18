# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class RestoreProfileNameScenario(MessageScenario, ComposableScenario):
    """Verify that the user's profile name was restored to the original value."""

    def _get_checks(self, state_path):
        original_name = self.get_scenario_context().get("originalName")
        if not original_name:
            # Template not resolved (e.g. offline triviality check).
            # The name is always at its original value in the initial state,
            # so report as completed so the triviality filter can exclude it.
            return {"name_restored": True}

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
        name_restored = (
            db_name is not None
            and db_name.strip().lower() == original_name.strip().lower()
        )

        return {"name_restored": name_restored}
