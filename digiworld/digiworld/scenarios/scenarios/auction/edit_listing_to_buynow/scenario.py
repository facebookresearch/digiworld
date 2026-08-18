# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class EditListingToBuynowScenario(AuctionScenario, TargetStateScenario):
    """Scenario for converting an auction listing to BuyNow."""

    def _check_task_completion(self, state_path):
        id_query = "SELECT id FROM items WHERE LOWER(title) = LOWER(?) AND seller_id = ?"
        rows = self._execute_query_in_path(
            id_query, (self.title, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(f"Item '{self.title}' not found in initial state")
        item_id = rows[0][0]

        check_query = "SELECT auction_flag, price FROM items WHERE id = ?"
        results = self._execute_query_in_path(check_query, (item_id,), state_path)
        if not results:
            raise ValueError(f"Item {item_id} not found in final state")

        auction_flag = results[0][0]
        actual_price = float(results[0][1])
        expected_price = float(self.price)

        return auction_flag == 0 and abs(actual_price - expected_price) <= 0.01
