# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckAccountBalanceScenario(BankingScenario, ComposableScenario):
    """Verify that the agent correctly reports an account's available balance."""

    def _get_checks(self, state_path):
        account_name = getattr(self, "account_name", None)
        if not account_name:
            raise ValueError("account_name parameter is required")

        query = (
            "SELECT a.available_balance "
            "FROM accounts a "
            "JOIN account_types at ON a.account_type_id = at.id "
            "WHERE a.user_id = ? AND a.account_name = ? AND a.status = 'active'"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, account_name), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No active account found with name '{account_name}' "
                f"for user {self.current_user_id}"
            )

        expected_balance = rows[0][0]
        logger.info(
            f"Expected available balance: {expected_balance}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": float_match(self.agent_answer, expected_balance)}
