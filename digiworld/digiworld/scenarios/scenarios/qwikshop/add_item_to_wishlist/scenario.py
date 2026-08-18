# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import TargetStateScenario


class AddItemToWishlistScenario(QwikshopScenario, TargetStateScenario):

    def _check_task_completion(self, state_path):
        query = """
            SELECT w.id FROM wishlists w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = ? AND LOWER(p.name) = LOWER(?)
        """
        initial_results = self._execute_query_in_path(
            query, (self.current_user_id, self.item), self.initial_state_path
        )
        if initial_results:
            raise ValueError(f"Product '{self.item}' was already in wishlist in initial state")

        results = self._execute_query_in_path(
            query, (self.current_user_id, self.item), state_path
        )
        return len(results) > 0
