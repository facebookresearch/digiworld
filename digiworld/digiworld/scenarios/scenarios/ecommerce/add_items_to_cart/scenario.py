# Copyright (c) Meta Platforms, Inc. and affiliates.
from typing import Dict

from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.verification import ComposableScenario


class AddItemsToCartScenario(EcommerceScenario, ComposableScenario):
    """Verify that the agent added all three specified items to the cart."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
        SELECT ci.product_name FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ?
        """
        initial_items, current_items, new_items = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )
        added_names_lower = [row[0].lower() for row in new_items]
        return {
            "item_1_added": any(self.item_1.lower() in n for n in added_names_lower),
            "item_2_added": any(self.item_2.lower() in n for n in added_names_lower),
            "item_3_added": any(self.item_3.lower() in n for n in added_names_lower),
        }
