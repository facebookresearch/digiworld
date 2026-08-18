# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CountActiveAuctionsScenario(AuctionScenario, ComposableScenario):
    """Verify that the agent correctly reports the user's active auction count."""

    def _get_checks(self, state_path):
        query = (
            "SELECT COUNT(*) FROM items "
            "WHERE seller_id = ? AND status = 'active' AND auction_flag = 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        expected = rows[0][0] if rows else 0
        logger.info(
            f"Expected active auction count: {expected}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": numeric_match(self.agent_answer, expected)}
