# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class PayeeWithExtremeAvgBillScenario(BankingScenario, ComposableScenario):
    """Verify the agent reports the payee with the highest/lowest avg bill."""

    def _get_checks(self, state_path):
        category = getattr(self, "category", None)
        extreme = getattr(self, "extreme", None)
        if not category:
            raise ValueError("category parameter is required")
        if not extreme:
            raise ValueError("extreme parameter is required")

        order = "DESC" if extreme.lower() == "highest" else "ASC"
        query = (
            f"SELECT name FROM billers "
            f"WHERE LOWER(category) = LOWER(?) AND is_active = 1 "
            f"AND average_bill_amount IS NOT NULL "
            f"ORDER BY average_bill_amount {order} LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (category,), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No active billers with average_bill_amount found in "
                f"category '{category}'"
            )

        expected_name = rows[0][0]
        logger.info(
            f"Expected payee with {extreme} avg bill in '{category}': "
            f"'{expected_name}', agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": substring_match(self.agent_answer, expected_name)}
