# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CountPayeesInCategoryScenario(BankingScenario, ComposableScenario):
    """Verify the agent correctly reports how many payees exist in a category."""

    def _get_checks(self, state_path):
        category = getattr(self, "category", None)
        if not category:
            raise ValueError("category parameter is required")

        query = (
            "SELECT COUNT(*) FROM billers "
            "WHERE LOWER(category) = LOWER(?) AND is_active = 1"
        )
        rows = self._execute_query_in_path(
            query, (category,), self.initial_state_path
        )
        expected = rows[0][0] if rows else 0
        logger.info(
            f"Expected payee count for '{category}': {expected}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": numeric_match(self.agent_answer, expected)}
