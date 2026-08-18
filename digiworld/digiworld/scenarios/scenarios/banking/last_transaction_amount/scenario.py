# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class LastTransactionAmountScenario(BankingScenario, ComposableScenario):
    """Verify that the agent correctly reports the amount of the user's last transaction."""

    def _get_checks(self, state_path):
        query = (
            "SELECT amount FROM transactions "
            "WHERE user_id = ? AND status = 'success' "
            "ORDER BY transaction_date DESC, id DESC LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No successful transactions found for user {self.current_user_id}"
            )

        expected_amount = rows[0][0]
        logger.info(
            f"Expected last transaction amount: {expected_amount}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": float_match(self.agent_answer, expected_amount)}
