# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_LIMIT_COLUMNS = {
    "daily": "daily_limit",
    "monthly": "monthly_limit",
}


class CheckLimitScenario(PaymentScenario, ComposableScenario):
    """Verify that the agent correctly reports the user's transaction limit."""

    def _get_checks(self, state_path):
        column = _LIMIT_COLUMNS.get(self.limit_type)
        if column is None:
            raise ValueError(
                f"Unrecognized limit_type: {self.limit_type!r}. "
                f"Expected one of {list(_LIMIT_COLUMNS)}"
            )

        query = f"SELECT {column} FROM users WHERE id = ?"
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No user found with id {self.current_user_id}"
            )

        expected_limit = rows[0][0]
        logger.info(
            f"Expected {self.limit_type} limit: {expected_limit}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": float_match(self.agent_answer, expected_limit)}
