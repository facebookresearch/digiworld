# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match, substring_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

# transaction_types.category values for direction mapping
_INCOMING_CATEGORIES = ("credit",)
_OUTGOING_CATEGORIES = ("debit", "transfer")

_ORDER_BY = {
    "most expensive": "t.amount DESC, t.id DESC",
    "least expensive": "t.amount ASC, t.id ASC",
    "oldest": "t.transaction_date ASC, t.id ASC",
    "newest": "t.transaction_date DESC, t.id DESC",
}


class ExtremeTransactionQueryScenario(BankingScenario, ComposableScenario):
    """Verify that the agent correctly identifies an extreme transaction."""

    def _get_checks(self, state_path):
        extreme_type = getattr(self, "extreme_type", None)
        direction = getattr(self, "direction", None)
        if not extreme_type:
            raise ValueError("extreme_type parameter is required")
        if not direction:
            raise ValueError("direction parameter is required")

        order_clause = _ORDER_BY.get(extreme_type.lower().strip())
        if not order_clause:
            raise ValueError(
                f"Unknown extreme_type '{extreme_type}'. "
                f"Expected one of: {', '.join(_ORDER_BY.keys())}"
            )

        direction_lower = direction.lower().strip()
        if direction_lower == "incoming":
            categories = _INCOMING_CATEGORIES
        elif direction_lower == "outgoing":
            categories = _OUTGOING_CATEGORIES
        else:
            raise ValueError(
                f"Unknown direction '{direction}'. Expected 'incoming' or 'outgoing'"
            )

        placeholders = ",".join("?" * len(categories))
        query = (
            "SELECT t.amount, t.description FROM transactions t "
            "JOIN transaction_types tt ON t.transaction_type_id = tt.id "
            f"WHERE t.user_id = ? AND t.status = 'success' AND tt.category IN ({placeholders}) "
            f"ORDER BY {order_clause} LIMIT 1"
        )
        params = (self.current_user_id, *categories)
        rows = self._execute_query_in_path(query, params, self.initial_state_path)

        if not rows:
            raise ValueError(
                f"No {direction} successful transactions found "
                f"for user {self.current_user_id}"
            )

        expected_amount, expected_description = rows[0]

        logger.info(
            f"Expected {extreme_type} {direction} transaction: "
            f"amount={expected_amount}, description={expected_description!r}, "
            f"agent answer: {self.agent_answer!r}"
        )

        checks = {}
        checks["amount_matches"] = float_match(self.agent_answer, expected_amount)
        if expected_description:
            checks["description_matches"] = substring_match(
                self.agent_answer, expected_description
            )
        return checks
