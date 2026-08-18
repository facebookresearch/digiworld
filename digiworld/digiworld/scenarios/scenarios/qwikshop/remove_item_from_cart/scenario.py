# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class RemoveItemFromCartScenario(QwikshopScenario, TargetStateScenario):
    """Scenario for removing a specified quantity of a product from the cart."""

    def _check_task_completion(self, state_path):
        query = "SELECT quantity FROM cart_items WHERE user_id = ? AND LOWER(product_name) = LOWER(?)"
        remove_qty = int(self.quantity)

        initial_results = self._execute_query_in_path(
            query, (self.current_user_id, self.item), self.initial_state_path
        )
        if not initial_results:
            raise ValueError(
                f"Item '{self.item}' not found in initial cart state"
            )

        initial_qty = initial_results[0][0]

        final_results = self._execute_query_in_path(
            query, (self.current_user_id, self.item), state_path
        )

        if remove_qty >= initial_qty:
            return len(final_results) == 0
        else:
            if not final_results:
                return False
            expected_qty = initial_qty - remove_qty
            return final_results[0][0] == expected_qty
