import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendPaymentAndCheckRecentScenario(PaymentScenario, ComposableScenario):
    """Verify that a payment was sent to the specified nickname and the
    agent correctly identifies them as the most recent contact."""

    def _get_checks(self, state_path):
        # --- send_payment_to_nickname check ---
        # Adapted from SendPaymentToNicknameScenario._check_task_completion
        target_amount = float(self.amount)

        query = """
        SELECT t.id, t.amount, t.status
        FROM transactions t
        JOIN wallets sender_wallet ON t.sender_wallet_id = sender_wallet.id
        JOIN wallets receiver_wallet ON t.receiver_wallet_id = receiver_wallet.id
        JOIN contacts c ON c.contact_user_id = receiver_wallet.user_id
        WHERE sender_wallet.user_id = ?
          AND c.user_id = ?
          AND c.nickname = ?
          AND t.amount = ?
          AND t.status = 'completed'
        ORDER BY t.created_at DESC
        """

        initial_transactions, current_transactions, new_transactions = (
            self.compare_database_records(
                self.initial_state_path,
                state_path,
                query,
                (
                    self.current_user_id,
                    self.current_user_id,
                    self.nickname,
                    target_amount,
                ),
            )
        )

        payment_sent = len(new_transactions) > 0
        logger.info(
            f"Payment of ${target_amount} to '{self.nickname}': "
            f"{'sent' if payment_sent else 'not sent'}"
        )

        # --- most_recent_contact check ---
        # The agent's answer should contain the nickname since the
        # just-sent payment IS the most recent transaction.
        answer_matches = substring_match(self.agent_answer, self.nickname)
        logger.info(
            f"Expected nickname in answer: {self.nickname!r}, "
            f"agent answer: {self.agent_answer!r}, match={answer_matches}"
        )

        return {
            "payment_sent": payment_sent,
            "answer_matches": answer_matches,
        }
