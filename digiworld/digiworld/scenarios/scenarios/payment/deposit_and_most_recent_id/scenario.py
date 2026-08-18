# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DepositAndMostRecentIdScenario(PaymentScenario, ComposableScenario):
    """Verify that a deposit was created and the agent correctly reports
    the transaction ID of the most recent transaction (the deposit itself)."""

    def _get_checks(self, state_path):
        # --- deposit_to_account checks ---
        raw = getattr(self, "amount", None)
        if raw is None:
            raise ValueError("amount parameter is required")

        target_amount = float(str(raw).replace("$", "").replace(",", ""))

        deposit_query = """
            SELECT t.id, t.amount, t.status, t.type
            FROM transactions t
            JOIN wallets w ON t.receiver_wallet_id = w.id
            WHERE w.user_id = ?
              AND t.type = 'deposit'
              AND t.amount = ?
              AND t.status = 'completed'
            ORDER BY t.created_at DESC
        """
        params = (self.current_user_id, target_amount)

        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, deposit_query, params
        )

        deposit_created = len(new_records) > 0
        logger.info(
            f"Deposit of ${target_amount}: "
            f"{'found' if deposit_created else 'not found'}"
        )

        # --- most_recent_transaction_id checks ---
        # After the deposit, the most recent transaction should be the
        # deposit itself, so we query the final state.
        ref_query = (
            "SELECT t.reference FROM transactions t "
            "JOIN wallets w ON t.sender_wallet_id = w.id "
            "   OR t.receiver_wallet_id = w.id "
            "WHERE w.user_id = ? "
            "ORDER BY t.created_at DESC "
            "LIMIT 1"
        )
        rows = self._execute_query_in_path(
            ref_query, (self.current_user_id,), state_path
        )

        if not rows:
            raise ValueError(
                f"No transactions found for user {self.current_user_id} "
                f"in final state"
            )

        expected_reference = rows[0][0]
        answer_matches = substring_match(self.agent_answer, expected_reference)
        logger.info(
            f"Expected most recent transaction reference: "
            f"{expected_reference!r}, agent answer: {self.agent_answer!r}, "
            f"match={answer_matches}"
        )

        return {
            "deposit_created": deposit_created,
            "answer_matches": answer_matches,
        }
