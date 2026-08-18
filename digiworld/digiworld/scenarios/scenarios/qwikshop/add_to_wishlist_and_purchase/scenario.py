# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: add item to wishlist then purchase from wishlist."""

from typing import Dict

from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import ComposableScenario


class AddToWishlistAndPurchaseScenario(QwikshopScenario, ComposableScenario):
    """Verify that the agent added an item to the wishlist and then purchased it.

    Combines add_item_to_wishlist (item in wishlists table)
    + purchase_from_wishlist (new order_items entry for the item).
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # Check 1: item is in the wishlist
        wishlist_query = """
            SELECT w.id FROM wishlists w
            JOIN products p ON w.product_id = p.id
            WHERE w.user_id = ? AND LOWER(p.name) = LOWER(?)
        """
        wishlist_results = self._execute_query_in_path(
            wishlist_query, (self.current_user_id, self.item), state_path
        )
        item_in_wishlist = len(wishlist_results) > 0

        # Check 2: item was purchased (new order_items entry)
        order_query = "SELECT product_name FROM order_items WHERE LOWER(product_name) = LOWER(?)"
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, order_query, (self.item,)
        )
        item_purchased = len(new_records) > 0

        return {
            "item_in_wishlist": item_in_wishlist,
            "item_purchased": item_purchased,
        }
