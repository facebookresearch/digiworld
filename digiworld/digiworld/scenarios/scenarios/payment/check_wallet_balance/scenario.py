# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckWalletBalanceScenario(PaymentScenario, ComposableScenario):
    """Verify that the agent correctly reports the current wallet balance."""

    def _get_checks(self, state_path):
        query = (
            "SELECT balance FROM wallets "
            "WHERE user_id = ? AND status = 'active'"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No active wallet found for user {self.current_user_id}"
            )

        expected_balance = rows[0][0]
        logger.info(
            f"Expected wallet balance: {expected_balance}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": float_match(self.agent_answer, expected_balance)}
