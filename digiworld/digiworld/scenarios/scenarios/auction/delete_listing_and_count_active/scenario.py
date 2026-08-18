# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_DELETED_STATUSES = {"cancelled", "ended", "closed", "deleted", "removed"}


class DeleteListingAndCountActiveScenario(AuctionScenario, ComposableScenario):
    """Verify that a listing was deleted and the agent correctly reports
    the updated active auction count."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        title = getattr(self, "title", None)
        if not title:
            raise ValueError("title parameter is required")

        # --- Part 1: listing deleted check (from delete_listing) ---

        query = "SELECT status FROM items WHERE LOWER(title) = LOWER(?)"
        results = self._execute_query_in_path(query, (title,), state_path)

        if not results:
            # Row was hard-deleted from the database -- that counts as deleted
            listing_deleted = True
        else:
            listing_deleted = results[0][0].lower() in _DELETED_STATUSES

        # --- Part 2: count active auctions check (from count_active_auctions) ---
        # After deleting a listing, the expected count depends on whether the
        # deleted listing was an active auction.

        # First check if the deleted listing was an active auction in initial state
        initial_item_query = (
            "SELECT status, auction_flag FROM items "
            "WHERE LOWER(title) = LOWER(?) AND seller_id = ?"
        )
        initial_item_rows = self._execute_query_in_path(
            initial_item_query, (title, self.current_user_id),
            self.initial_state_path,
        )

        was_active_auction = False
        if initial_item_rows:
            status = initial_item_rows[0][0]
            auction_flag = initial_item_rows[0][1]
            was_active_auction = (
                status == "active" and auction_flag == 1
            )

        # Count initial active auctions
        count_query = (
            "SELECT COUNT(*) FROM items "
            "WHERE seller_id = ? AND status = 'active' AND auction_flag = 1"
        )
        initial_rows = self._execute_query_in_path(
            count_query, (self.current_user_id,), self.initial_state_path
        )
        initial_count = initial_rows[0][0] if initial_rows else 0

        # If deleted listing was active auction, expected = initial - 1
        if was_active_auction:
            expected_count = initial_count - 1
        else:
            expected_count = initial_count

        answer_matches = numeric_match(self.agent_answer, expected_count)

        logger.info(
            "Delete listing and count active check: "
            "listing_deleted=%s, was_active_auction=%s, "
            "initial_count=%d, expected_count=%d, "
            "agent_answer=%r, answer_matches=%s",
            listing_deleted, was_active_auction,
            initial_count, expected_count,
            self.agent_answer, answer_matches,
        )

        return {
            "listing_deleted": listing_deleted,
            "answer_matches": answer_matches,
        }
