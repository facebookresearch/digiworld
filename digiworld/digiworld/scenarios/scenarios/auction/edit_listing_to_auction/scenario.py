# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class EditListingToAuctionScenario(AuctionScenario, TargetStateScenario):
    """Scenario for converting a BuyNow listing to an auction."""

    def _check_task_completion(self, state_path):
        id_query = "SELECT id FROM items WHERE LOWER(title) = LOWER(?) AND seller_id = ?"
        rows = self._execute_query_in_path(
            id_query, (self.title, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(f"Item '{self.title}' not found in initial state")
        item_id = rows[0][0]

        check_query = "SELECT auction_flag, starting_bid FROM items WHERE id = ?"
        results = self._execute_query_in_path(check_query, (item_id,), state_path)
        if not results:
            raise ValueError(f"Item {item_id} not found in final state")

        auction_flag = results[0][0]
        actual_bid = float(results[0][1]) if results[0][1] is not None else 0.0
        expected_bid = float(self.startBid)

        return auction_flag == 1 and abs(actual_bid - expected_bid) <= 0.01
