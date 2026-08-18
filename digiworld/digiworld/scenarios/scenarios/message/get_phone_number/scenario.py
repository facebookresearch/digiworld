# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetPhoneNumberScenario(MessageScenario, ComposableScenario):
    """Verify that the agent correctly reports the user's registered phone number."""

    def _get_checks(self, state_path):
        query = "SELECT phone_number FROM users WHERE id = ?"
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No phone_number found for user_id={self.current_user_id}"
            )

        expected_phone = rows[0][0]
        logger.info(
            "Expected phone: %s, agent answer: %r",
            expected_phone, self.agent_answer,
        )
        return {"answer_matches": substring_match(self.agent_answer, expected_phone)}
