# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class AddItemToCartScenario(QwikshopScenario, TargetStateScenario):
    """Scenario for adding a specified quantity of a product to the cart."""

    def _check_task_completion(self, state_path):
        query = "SELECT quantity FROM cart_items WHERE user_id = ? AND LOWER(product_name) = LOWER(?)"

        # Precondition: item must NOT already be in the cart at the required qty
        initial_results = self._execute_query_in_path(
            query, (self.current_user_id, self.item), self.initial_state_path
        )
        required_qty = int(self.quantity)
        already_in_cart = initial_results and any(
            row[0] >= required_qty for row in initial_results
        )
        if already_in_cart:
            raise ValueError(
                f"Product '{self.item}' was already in cart with sufficient "
                f"quantity in initial state — vacuous truth"
            )

        results = self._execute_query_in_path(
            query, (self.current_user_id, self.item), state_path
        )

        if not results:
            return False

        return any(row[0] >= required_qty for row in results)
