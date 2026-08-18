import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetLimitAndCheckScenario(PaymentScenario, ComposableScenario):
    """Verify that the daily transaction limit was set to the specified
    amount and the agent correctly reports it."""

    def _get_checks(self, state_path):
        # --- set_daily_transaction_limit check ---
        # Adapted from SetDailyTransactionLimitScenario._check_task_completion
        target_amount = float(str(self.amount).replace("$", "").replace(",", ""))

        query = "SELECT daily_limit FROM users WHERE id = ?"
        initial_limits, current_limits, _ = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id,),
        )

        limit_set = False
        if current_limits:
            current_limits_list = list(current_limits)
            current_limit = float(current_limits_list[0][0])
            limit_set = abs(current_limit - target_amount) < 0.01

        logger.info(
            f"Target daily limit: {target_amount}, "
            f"limit_set={limit_set}"
        )

        # --- check_limit check (limit_type = daily) ---
        # The agent's answer should match the amount they just set.
        answer_matches = float_match(self.agent_answer, target_amount)
        logger.info(
            f"Expected daily limit in answer: {target_amount}, "
            f"agent answer: {self.agent_answer!r}, match={answer_matches}"
        )

        return {
            "limit_set": limit_set,
            "answer_matches": answer_matches,
        }
