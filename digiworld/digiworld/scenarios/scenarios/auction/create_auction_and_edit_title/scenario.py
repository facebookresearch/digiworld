# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateAuctionAndEditTitleScenario(AuctionScenario, ComposableScenario):
    """Verify that an auction listing was created and then its title was changed."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1 + Part 2: listing created with new title ---
        # After creating the listing with `title` and renaming it to `new_title`,
        # we expect to find an auction owned by the user with the new title,
        # and the starting bid should match.

        query = (
            "SELECT id, title, auction_flag, starting_bid "
            "FROM items WHERE seller_id = ? AND LOWER(title) = LOWER(?)"
        )
        results = self._execute_query_in_path(
            query, (self.current_user_id, self.new_title), state_path
        )

        if not results:
            logger.info(
                "No listing found with new title '%s' in final state",
                self.new_title,
            )
            return {
                "listing_created": False,
                "title_changed": False,
                "is_auction": False,
                "starting_bid_matches": False,
            }

        record = results[0]
        auction_flag = record[2]
        actual_bid = float(record[3]) if record[3] is not None else 0.0

        # The listing exists with the new title
        title_changed = True

        # Verify it was not present in the initial state (it's genuinely new)
        initial_query = (
            "SELECT id FROM items WHERE seller_id = ? AND LOWER(title) = LOWER(?)"
        )
        initial_with_new_title = self._execute_query_in_path(
            initial_query, (self.current_user_id, self.new_title),
            self.initial_state_path,
        )
        initial_with_old_title = self._execute_query_in_path(
            initial_query, (self.current_user_id, self.title),
            self.initial_state_path,
        )

        # The listing is genuinely new if neither old nor new title existed before
        listing_created = (
            len(initial_with_new_title) == 0
            and len(initial_with_old_title) == 0
        )

        is_auction = auction_flag == 1

        try:
            expected_bid = float(self.startbid)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid startbid parameter: {self.startbid}")

        starting_bid_matches = abs(actual_bid - expected_bid) <= max(
            1.0, expected_bid * 0.05
        )

        logger.info(
            "Create auction and edit title check: "
            "listing_created=%s, title_changed=%s, "
            "is_auction=%s, auction_flag=%s, "
            "actual_bid=%s, expected_bid=%s, "
            "starting_bid_matches=%s",
            listing_created, title_changed,
            is_auction, auction_flag,
            actual_bid, expected_bid,
            starting_bid_matches,
        )

        return {
            "listing_created": listing_created,
            "title_changed": title_changed,
            "is_auction": is_auction,
            "starting_bid_matches": starting_bid_matches,
        }
