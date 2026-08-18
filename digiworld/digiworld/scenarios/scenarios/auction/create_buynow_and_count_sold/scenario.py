# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateBuynowAndCountSoldScenario(AuctionScenario, ComposableScenario):
    """Verify that a BuyNow listing was created and the agent correctly
    reports the number of sold listings."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: listing creation check (from create_buynow_listing) ---

        query = "SELECT id, title, auction_flag, price FROM items WHERE seller_id = ?"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        listing_created = False
        try:
            target_price = float(self.price)
        except (ValueError, TypeError):
            raise ValueError(f"Invalid price parameter: {self.price}")

        for record in new_records:
            db_title = record[1]
            auction_flag = record[2]
            price = record[3]

            if db_title.lower() != self.title.lower():
                continue
            if auction_flag != 0:
                continue
            if price is None:
                continue

            tolerance = max(1.0, target_price * 0.05)
            if abs(price - target_price) <= tolerance:
                listing_created = True
                break

        # --- Part 2: count sold listings check (from count_sold_listings) ---
        # The newly created listing is not sold, so expected count = initial sold count

        count_query = (
            "SELECT COUNT(*) FROM items "
            "WHERE seller_id = ? AND status = 'sold'"
        )
        initial_rows = self._execute_query_in_path(
            count_query, (self.current_user_id,), self.initial_state_path
        )
        expected_count = initial_rows[0][0] if initial_rows else 0

        answer_matches = numeric_match(self.agent_answer, expected_count)

        logger.info(
            "Create BuyNow and count sold check: "
            "listing_created=%s, expected_sold=%d, "
            "agent_answer=%r, answer_matches=%s",
            listing_created, expected_count,
            self.agent_answer, answer_matches,
        )

        return {
            "listing_created": listing_created,
            "answer_matches": answer_matches,
        }
