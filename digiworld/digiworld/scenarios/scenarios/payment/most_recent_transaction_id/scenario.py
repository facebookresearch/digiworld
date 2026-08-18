# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class MostRecentTransactionIdScenario(PaymentScenario, ComposableScenario):
    """Verify that the agent correctly reports the most recent transaction reference."""

    def _get_checks(self, state_path):
        query = (
            "SELECT t.reference FROM transactions t "
            "JOIN wallets w ON t.sender_wallet_id = w.id OR t.receiver_wallet_id = w.id "
            "WHERE w.user_id = ? "
            "ORDER BY t.created_at DESC "
            "LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No transactions found for user {self.current_user_id}"
            )

        expected_reference = rows[0][0]
        logger.info(
            f"Expected transaction reference: {expected_reference!r}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": substring_match(self.agent_answer, expected_reference),
        }
