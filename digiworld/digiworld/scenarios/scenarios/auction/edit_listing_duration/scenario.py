# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class EditListingDurationScenario(AuctionScenario, TargetStateScenario):
    """Scenario for editing an auction listing's duration."""

    def _check_task_completion(self, state_path):
        id_query = "SELECT id FROM items WHERE LOWER(title) = LOWER(?) AND seller_id = ?"
        rows = self._execute_query_in_path(
            id_query, (self.title, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(f"Item '{self.title}' not found in initial state")
        item_id = rows[0][0]

        initial_query = "SELECT end_time FROM items WHERE id = ?"
        initial_results = self._execute_query_in_path(
            initial_query, (item_id,), self.initial_state_path
        )
        if not initial_results:
            raise ValueError(f"Item {item_id} not found in initial state")
        initial_end_time = int(initial_results[0][0])

        final_results = self._execute_query_in_path(
            initial_query, (item_id,), state_path
        )
        if not final_results:
            raise ValueError(f"Item {item_id} not found in final state")
        final_end_time = int(final_results[0][0])

        return final_end_time != initial_end_time and final_end_time > initial_end_time
