# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import boolean_match, numeric_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class PendingBillsInCategoryScenario(BankingScenario, ComposableScenario):
    """Verify the agent correctly reports pending/outstanding bills in a category."""

    def _get_checks(self, state_path):
        category = getattr(self, "category", None)
        if not category:
            raise ValueError("category parameter is required")

        query = (
            "SELECT COUNT(*) FROM bills b "
            "JOIN billers bl ON b.biller_id = bl.id "
            "WHERE b.user_id = ? AND LOWER(bl.category) = LOWER(?) "
            "AND b.status IN ('pending', 'overdue')"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, category), self.initial_state_path
        )
        count = rows[0][0] if rows else 0
        has_pending = count > 0

        logger.info(
            f"Pending/overdue bills in '{category}': {count}, "
            f"expected answer affirmative={has_pending}, "
            f"agent answer: {self.agent_answer!r}"
        )

        checks = {
            "answer_matches": boolean_match(self.agent_answer, has_pending),
        }
        if has_pending:
            checks["mentions_count"] = numeric_match(self.agent_answer, count)

        return checks
