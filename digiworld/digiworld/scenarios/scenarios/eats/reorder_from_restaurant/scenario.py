# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ReorderFromRestaurantScenario(EatsScenario, ComposableScenario):
    """Verify that a reorder was placed matching the most recent order from the restaurant."""

    def _get_checks(self, state_path):
        restaurant_name = getattr(self, "restaurant", None)
        if not restaurant_name:
            raise ValueError("restaurant parameter is required")

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

        original_order_rows = self._execute_query_in_path(
            "SELECT id FROM orders WHERE user_id = ? AND restaurant_id = ? "
            "ORDER BY created_at DESC LIMIT 1",
            (self.current_user_id, restaurant_id),
            self.initial_state_path,
        )
        if not original_order_rows:
            raise ValueError(
                f"No previous order found for user {self.current_user_id} "
                f"at restaurant '{restaurant_name}'"
            )
        original_order_id = original_order_rows[0][0]

        original_items = self._execute_query_in_path(
            "SELECT menu_item_id, quantity FROM order_items WHERE order_id = ?",
            (original_order_id,),
            self.initial_state_path,
        )

        _, _, new_rows = self.compare_database_records(
            self.initial_state_path,
            state_path,
            "SELECT id, user_id, restaurant_id, status, total "
            "FROM orders WHERE user_id = ? AND restaurant_id = ?",
            (self.current_user_id, restaurant_id),
        )

        new_order_exists = len(new_rows) > 0

        items_match = False
        if new_order_exists:
            latest_order_rows = self._execute_query_in_path(
                "SELECT id FROM orders "
                "WHERE user_id = ? AND restaurant_id = ? "
                "ORDER BY created_at DESC, id DESC LIMIT 1",
                (self.current_user_id, restaurant_id),
                state_path,
            )
            if not latest_order_rows:
                raise ValueError(
                    f"Unable to locate the reordered order for "
                    f"user {self.current_user_id} at restaurant '{restaurant_name}'"
                )

            new_order_id = latest_order_rows[0][0]
            new_items = self._execute_query_in_path(
                "SELECT menu_item_id, quantity FROM order_items "
                "WHERE order_id = ?",
                (new_order_id,),
                state_path,
            )
            original_set = {(row[0], row[1]) for row in original_items}
            new_set = {(row[0], row[1]) for row in new_items}
            items_match = original_set == new_set

        return {
            "new_order_exists": new_order_exists,
            "items_match": items_match,
        }
