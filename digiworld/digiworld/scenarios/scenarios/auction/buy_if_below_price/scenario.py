# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import TargetStateScenario

logger = logging.getLogger(__name__)


class BuyIfBelowPriceScenario(AuctionScenario, TargetStateScenario):
    """Verify that the agent purchased the item when its price was below the threshold."""

    def _check_task_completion(self, state_path):
        tx_query = (
            "SELECT t.id FROM transactions t "
            "JOIN items i ON t.item_id = i.id "
            "WHERE t.user_id = ? AND LOWER(i.title) = LOWER(?) "
            "AND t.transaction_type = 'purchase'"
        )
        _, _, new_transactions = self.compare_database_records(
            self.initial_state_path,
            state_path,
            tx_query,
            (self.current_user_id, self.title),
        )

        if not new_transactions:
            logger.info("No purchase transaction found for the target item")
            return False

        logger.info(
            f"Found {len(new_transactions)} new purchase transaction(s) "
            f"for '{self.title}'"
        )
        return True
