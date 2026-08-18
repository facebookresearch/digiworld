import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DepositAndCheckBalanceScenario(PaymentScenario, ComposableScenario):
    """Verify that a deposit was created and the agent correctly reports
    the resulting wallet balance."""

    def _get_checks(self, state_path):
        # --- deposit_to_account checks ---
        raw = getattr(self, "amount", None)
        if raw is None:
            raise ValueError("amount parameter is required")

        target_amount = float(str(raw).replace("$", "").replace(",", ""))

        query = """
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
            self.initial_state_path, state_path, query, params
        )

        deposit_created = len(new_records) > 0
        logger.info(
            f"Deposit of ${target_amount}: "
            f"{'found' if deposit_created else 'not found'}"
        )

        # --- check_wallet_balance checks ---
        # Expected balance = initial balance + deposit amount
        balance_query = (
            "SELECT balance FROM wallets "
            "WHERE user_id = ? AND status = 'active'"
        )
        rows = self._execute_query_in_path(
            balance_query, (self.current_user_id,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No active wallet found for user {self.current_user_id}"
            )

        initial_balance = float(rows[0][0])
        expected_balance = initial_balance + target_amount
        answer_matches = float_match(self.agent_answer, expected_balance)
        logger.info(
            f"Initial balance: {initial_balance}, deposit: {target_amount}, "
            f"expected balance: {expected_balance}, "
            f"agent answer: {self.agent_answer!r}, match={answer_matches}"
        )

        return {
            "deposit_created": deposit_created,
            "answer_matches": answer_matches,
        }
