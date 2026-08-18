# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class RemoveNexusPayFavoriteScenario(BankingScenario, ComposableScenario):
    """Verify that a Zelle contact was removed from favorites."""

    def _get_checks(self, state_path):
        contact_name = getattr(self, "contact_name", None)
        if not contact_name:
            raise ValueError("contact_name parameter is required")

        query = (
            "SELECT is_favorite FROM zelle_contacts "
            "WHERE user_id = ? AND LOWER(contact_name) = LOWER(?)"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, contact_name), state_path
        )

        if not rows:
            logger.warning(
                f"Zelle contact '{contact_name}' not found for user "
                f"{self.current_user_id} at final state"
            )
            return {"contact_not_favorite": False}

        is_not_favorite = rows[0][0] == 0
        logger.info(
            f"Contact '{contact_name}' is_favorite={rows[0][0]} at final state, "
            f"expected 0 (not favorite)"
        )
        return {"contact_not_favorite": is_not_favorite}
