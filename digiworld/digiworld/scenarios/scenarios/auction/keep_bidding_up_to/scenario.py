# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import TargetStateScenario

logger = logging.getLogger(__name__)


class KeepBiddingUpToScenario(AuctionScenario, TargetStateScenario):
    """Verify that the agent placed bids on the target item within the price limit."""

    def _check_task_completion(self, state_path):
        bid_query = (
            "SELECT b.id, b.bid_amount FROM bids b "
            "JOIN items i ON b.item_id = i.id "
            "WHERE b.user_id = ? AND LOWER(i.title) = LOWER(?)"
        )
        _, _, new_bids = self.compare_database_records(
            self.initial_state_path,
            state_path,
            bid_query,
            (self.current_user_id, self.title),
        )

        if not new_bids:
            logger.info("No new bids found on the target item")
            return False

        price_limit = float(self.price)
        for bid_id, bid_amount in new_bids:
            if bid_amount > price_limit:
                logger.info(
                    f"Bid {bid_id} amount {bid_amount} exceeds "
                    f"price limit {price_limit}"
                )
                return False

        logger.info(
            f"Found {len(new_bids)} new bid(s), all within limit {price_limit}"
        )
        return True
