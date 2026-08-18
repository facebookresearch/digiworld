# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import logging

from digiworld.scenarios.answer_matchers import date_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class LastTransactionDateScenario(BankingScenario, ComposableScenario):
    """Verify that the agent correctly reports the date of the user's last transaction."""

    def _get_checks(self, state_path):
        query = (
            "SELECT transaction_date FROM transactions "
            "WHERE user_id = ? AND status = 'success' "
            "ORDER BY transaction_date DESC, id DESC LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No successful transactions found for user {self.current_user_id}"
            )

        raw_date = rows[0][0]
        expected_date = datetime.datetime.fromisoformat(raw_date).date()
        logger.info(
            f"Expected last transaction date: {expected_date}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": date_match(self.agent_answer, expected_date)}
