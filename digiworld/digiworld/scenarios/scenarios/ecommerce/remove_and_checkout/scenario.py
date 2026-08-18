# Copyright (c) Meta Platforms, Inc. and affiliates.
from typing import Dict

from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.verification import ComposableScenario


class RemoveAndCheckoutScenario(EcommerceScenario, ComposableScenario):
    """Verify item removal from cart followed by a successful checkout."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        cart_query = """
        SELECT ci.product_name FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ?
        """
        cart_rows = self._execute_query_in_path(
            cart_query, (self.current_user_id,), state_path
        )

        initial_order_ids = {
            row[0]
            for row in self._execute_query_in_path(
                "SELECT id FROM orders WHERE user_id = ?",
                (self.current_user_id,),
                self.initial_state_path,
            )
        }
        current_order_ids = {
            row[0]
            for row in self._execute_query_in_path(
                "SELECT id FROM orders WHERE user_id = ?",
                (self.current_user_id,),
                state_path,
            )
        }
        new_order_ids = current_order_ids - initial_order_ids
        has_new_order = len(new_order_ids) > 0

        removed_item_absent_from_order = True
        if new_order_ids:
            new_order_id = next(iter(new_order_ids))
            order_item_rows = self._execute_query_in_path(
                "SELECT product_name FROM order_items WHERE order_id = ?",
                (new_order_id,),
                state_path,
            )
            order_product_names = [r[0].lower() for r in order_item_rows]
            if any(self.item_to_remove.lower() in n for n in order_product_names):
                removed_item_absent_from_order = False

        return {
            "cart_empty_after_checkout": len(cart_rows) == 0,
            "new_order_created": has_new_order,
            "removed_item_not_in_order": removed_item_absent_from_order,
        }
