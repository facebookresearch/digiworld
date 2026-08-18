# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_INFO_TYPE_TO_COLUMN = {
    "email address": "contact_email",
    "phone number": "contact_phone",
}


class NexusPayContactInfoScenario(BankingScenario, ComposableScenario):
    """Verify that the agent correctly reports a Nexus Pay contact's info."""

    def _get_checks(self, state_path):
        contact_name = getattr(self, "contact_name", None)
        info_type = getattr(self, "info_type", None)
        if not contact_name:
            raise ValueError("contact_name parameter is required")
        if not info_type:
            raise ValueError("info_type parameter is required")

        column = _INFO_TYPE_TO_COLUMN.get(info_type.lower().strip())
        if not column:
            known = ", ".join(_INFO_TYPE_TO_COLUMN.keys())
            raise ValueError(
                f"Unknown info_type '{info_type}'. Known types: {known}"
            )

        query = (
            f"SELECT contact_email, contact_phone FROM zelle_contacts "
            "WHERE user_id = ? AND LOWER(contact_name) = LOWER(?)"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, contact_name), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No Nexus Pay contact named '{contact_name}' "
                f"found for user {self.current_user_id}"
            )

        col_index = 0 if column == "contact_email" else 1
        expected_value = rows[0][col_index]

        if not expected_value:
            raise ValueError(
                f"Contact '{contact_name}' has no {info_type} on record"
            )

        logger.info(
            f"Expected {info_type} for {contact_name}: {expected_value!r}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": substring_match(self.agent_answer, expected_value)}
