"""Composed scenario: order an item, then reorder from the same restaurant."""

import logging

from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class OrderAndReorderScenario(EatsScenario, ComposableScenario):
    """Verify an order was placed and then a matching reorder was created."""

    def _get_checks(self, state_path):
        restaurant_name = getattr(self, "restaurant", None)
        restaurant_item = getattr(self, "restaurant_item", None)
        quantity = getattr(self, "quantity", None)
        if not restaurant_name:
            raise ValueError("restaurant parameter is required")
        if not restaurant_item:
            raise ValueError("restaurant_item parameter is required")
        if quantity is None:
            raise ValueError("quantity parameter is required")

        requested_quantity = int(quantity)

        restaurant_rows = self._execute_query_in_path(
            "SELECT id FROM restaurants WHERE LOWER(name) = LOWER(?)",
            (restaurant_name,),
            self.initial_state_path,
        )
        if not restaurant_rows:
            raise ValueError(
                f"Restaurant '{restaurant_name}' not found in initial state"
            )
        restaurant_id = restaurant_rows[0][0]

        item_rows = self._execute_query_in_path(
            "SELECT id FROM menu_items "
            "WHERE LOWER(name) = LOWER(?) AND restaurant_id = ?",
            (restaurant_item, restaurant_id),
            self.initial_state_path,
        )
        if not item_rows:
            raise ValueError(
                f"Menu item '{restaurant_item}' not found at "
                f"restaurant '{restaurant_name}'"
            )
        menu_item_id = item_rows[0][0]

        # --- First order checks (from order_item) ---
        _, _, new_rows = self.compare_database_records(
            self.initial_state_path,
            state_path,
            "SELECT id, user_id, restaurant_id, status, total "
            "FROM orders WHERE user_id = ? AND restaurant_id = ?",
            (self.current_user_id, restaurant_id),
        )

        first_order_placed = len(new_rows) > 0
        correct_item = False
        correct_quantity = False

        if first_order_placed:
            # Get all new orders sorted by creation time
            all_new_orders = self._execute_query_in_path(
                "SELECT id FROM orders "
                "WHERE user_id = ? AND restaurant_id = ? "
                "ORDER BY created_at ASC, id ASC",
                (self.current_user_id, restaurant_id),
                state_path,
            )
            initial_orders = self._execute_query_in_path(
                "SELECT id FROM orders "
                "WHERE user_id = ? AND restaurant_id = ?",
                (self.current_user_id, restaurant_id),
                self.initial_state_path,
            )
            initial_order_ids = {row[0] for row in initial_orders}
            new_order_ids = [row[0] for row in all_new_orders if row[0] not in initial_order_ids]

            if new_order_ids:
                # First new order is the initial order
                first_order_id = new_order_ids[0]
                order_items = self._execute_query_in_path(
                    "SELECT menu_item_id, quantity FROM order_items "
                    "WHERE order_id = ?",
                    (first_order_id,),
                    state_path,
                )
                for row in order_items:
                    if row[0] == menu_item_id:
                        correct_item = True
                        if row[1] == requested_quantity:
                            correct_quantity = True
                        break

        # --- Reorder checks (from reorder_from_restaurant) ---
        # The reorder should create a second new order matching the first
        reorder_exists = len(new_rows) >= 2
        items_match = False

        if reorder_exists and new_order_ids and len(new_order_ids) >= 2:
            first_order_id = new_order_ids[0]
            reorder_id = new_order_ids[-1]

            first_items = self._execute_query_in_path(
                "SELECT menu_item_id, quantity FROM order_items "
                "WHERE order_id = ?",
                (first_order_id,),
                state_path,
            )
            reorder_items = self._execute_query_in_path(
                "SELECT menu_item_id, quantity FROM order_items "
                "WHERE order_id = ?",
                (reorder_id,),
                state_path,
            )
            first_set = {(row[0], row[1]) for row in first_items}
            reorder_set = {(row[0], row[1]) for row in reorder_items}
            items_match = first_set == reorder_set

        return {
            "first_order_placed": first_order_placed,
            "correct_item": correct_item,
            "correct_quantity": correct_quantity,
            "reorder_exists": reorder_exists,
            "items_match": items_match,
        }
