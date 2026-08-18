# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateListingAndCountActiveScenario(AuctionScenario, ComposableScenario):
    """Verify that a new auction listing was created and the agent correctly
    reports the updated active auction count."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: listing creation check (from create_auction_listing) ---

        query = "SELECT id, title, auction_flag, starting_bid FROM items WHERE seller_id = ?"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        listing_created = False
        try:
            target_bid = float(self.startbid)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid startbid parameter: {self.startbid}")

        for record in new_records:
            db_title = record[1]
            auction_flag = record[2]
            starting_bid = record[3]

            if db_title.lower() != self.title.lower():
                continue
            if auction_flag != 1:
                continue
            if starting_bid is None:
                continue

            tolerance = max(1.0, target_bid * 0.05)
            if abs(starting_bid - target_bid) <= tolerance:
                listing_created = True
                break

        # --- Part 2: count active auctions check (from count_active_auctions) ---
        # After creating the listing, expected count = initial count + 1

        count_query = (
            "SELECT COUNT(*) FROM items "
            "WHERE seller_id = ? AND status = 'active' AND auction_flag = 1"
        )
        initial_rows = self._execute_query_in_path(
            count_query, (self.current_user_id,), self.initial_state_path
        )
        initial_count = initial_rows[0][0] if initial_rows else 0
        expected_count = initial_count + 1

        answer_matches = numeric_match(self.agent_answer, expected_count)

        logger.info(
            f"Create listing and count check: listing_created={listing_created}, "
            f"initial_active={initial_count}, expected={expected_count}, "
            f"agent_answer={self.agent_answer!r}, answer_matches={answer_matches}"
        )

        return {
            "listing_created": listing_created,
            "answer_matches": answer_matches,
        }
