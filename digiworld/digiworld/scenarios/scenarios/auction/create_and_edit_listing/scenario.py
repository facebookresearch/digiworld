import logging
from typing import Dict

from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateAndEditListingScenario(AuctionScenario, ComposableScenario):
    """Verify that a BuyNow listing was created and then converted to an auction."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: listing created check (title exists in final state) ---

        query = (
            "SELECT id, title, auction_flag, starting_bid, price "
            "FROM items WHERE seller_id = ? AND LOWER(title) = LOWER(?)"
        )
        results = self._execute_query_in_path(
            query, (self.current_user_id, self.title), state_path
        )

        if not results:
            logger.info(f"No listing found with title '{self.title}' in final state")
            return {
                "listing_created": False,
                "is_auction": False,
                "starting_bid_matches": False,
            }

        listing_created = True
        record = results[0]
        auction_flag = record[2]
        actual_bid = float(record[3]) if record[3] is not None else 0.0

        # --- Part 2: edit to auction check (from edit_listing_to_auction) ---

        is_auction = auction_flag == 1

        try:
            expected_bid = float(self.startBid)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid startBid parameter: {self.startBid}")

        starting_bid_matches = abs(actual_bid - expected_bid) <= max(1.0, expected_bid * 0.05)

        logger.info(
            f"Create and edit listing check: listing_created={listing_created}, "
            f"is_auction={is_auction}, auction_flag={auction_flag}, "
            f"actual_bid={actual_bid}, expected_bid={expected_bid}, "
            f"starting_bid_matches={starting_bid_matches}"
        )

        return {
            "listing_created": listing_created,
            "is_auction": is_auction,
            "starting_bid_matches": starting_bid_matches,
        }
