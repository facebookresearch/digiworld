# Copyright (c) Meta Platforms, Inc. and affiliates.
from typing import Dict

from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.verification import ComposableScenario


class AddItemToCartScenario(EcommerceScenario, ComposableScenario):
    """Verify that the agent added the specified item to the cart."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
        SELECT ci.product_name FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ?
        """
        initial_items, current_items, new_items = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )
        target = self.item.lower()
        added_names = [row[0].lower() for row in new_items]
        return {
            "item_added": any(target in n or n in target for n in added_names),
        }
