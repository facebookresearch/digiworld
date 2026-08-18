# Copyright (c) Meta Platforms, Inc. and affiliates.
from typing import Dict

from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.verification import ComposableScenario


class RemoveItemFromCartScenario(EcommerceScenario, ComposableScenario):
    """Verify that the agent removed the specified item from the cart."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
        SELECT ci.product_name FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ?
        """
        # Check that the item existed in the initial state (prevents vacuous truth)
        initial_rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        initial_names = [row[0].lower() for row in initial_rows]
        item_existed = any(self.item.lower() in n for n in initial_names)

        rows = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        remaining_names = [row[0].lower() for row in rows]
        return {
            "item_was_in_cart": item_existed,
            "item_removed": not any(
                self.item.lower() in n for n in remaining_names
            ),
        }
