# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckInitialDepositScenario(BankingScenario, ComposableScenario):
    """Verify the agent correctly reports the minimum opening balance for an account type."""

    def _get_checks(self, state_path):
        account_type = getattr(self, "account_type", None)
        if not account_type:
            raise ValueError("account_type parameter is required")

        query = (
            "SELECT min_opening_balance FROM account_types "
            "WHERE LOWER(name) LIKE ? OR LOWER(code) LIKE ?"
        )
        search_term = f"%{account_type.lower()}%"
        rows = self._execute_query_in_path(
            query, (search_term, search_term), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No account type found matching '{account_type}'"
            )

        expected_deposit = rows[0][0]
        logger.info(
            f"Expected initial deposit for '{account_type}': {expected_deposit}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": float_match(self.agent_answer, expected_deposit)}
