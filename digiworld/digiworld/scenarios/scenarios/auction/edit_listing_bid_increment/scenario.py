# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class EditListingBidIncrementScenario(AuctionScenario, TargetStateScenario):
    """Scenario for editing an auction listing's bid increment."""

    def _check_task_completion(self, state_path):
        id_query = "SELECT id FROM items WHERE LOWER(title) = LOWER(?) AND seller_id = ?"
        rows = self._execute_query_in_path(
            id_query, (self.title, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(f"Item '{self.title}' not found in initial state")
        item_id = rows[0][0]

        check_query = "SELECT bid_increment FROM items WHERE id = ?"
        results = self._execute_query_in_path(check_query, (item_id,), state_path)
        if not results:
            raise ValueError(f"Item {item_id} not found in final state")

        return abs(float(results[0][0]) - float(self.BidIncrement)) <= 0.01
