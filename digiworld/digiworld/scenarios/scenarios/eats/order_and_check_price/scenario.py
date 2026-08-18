# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: order an item, then report its price."""

import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class OrderAndCheckPriceScenario(EatsScenario, ComposableScenario):
    """Verify an order was placed and the agent reports the item price."""

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

        # --- Order checks (from order_item) ---
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

        _, _, new_rows = self.compare_database_records(
            self.initial_state_path,
            state_path,
            "SELECT id, user_id, restaurant_id, status, total "
            "FROM orders WHERE user_id = ? AND restaurant_id = ?",
            (self.current_user_id, restaurant_id),
        )

        order_placed = len(new_rows) > 0
        correct_item = False
        correct_quantity = False

        if order_placed:
            latest_order_rows = self._execute_query_in_path(
                "SELECT id FROM orders "
                "WHERE user_id = ? AND restaurant_id = ? "
                "ORDER BY created_at DESC, id DESC LIMIT 1",
                (self.current_user_id, restaurant_id),
                state_path,
            )
            if not latest_order_rows:
                raise ValueError(
                    f"Unable to locate the newly placed order for "
                    f"user {self.current_user_id} at restaurant '{restaurant_name}'"
                )

            new_order_id = latest_order_rows[0][0]
            order_items = self._execute_query_in_path(
                "SELECT menu_item_id, quantity FROM order_items "
                "WHERE order_id = ?",
                (new_order_id,),
                state_path,
            )
            for row in order_items:
                if row[0] == menu_item_id:
                    correct_item = True
                    if row[1] == requested_quantity:
                        correct_quantity = True
                    break

        # --- Price check (from check_item_price) ---
        price_query = (
            "SELECT mi.price "
            "FROM menu_items mi "
            "JOIN restaurants r ON mi.restaurant_id = r.id "
            "WHERE LOWER(mi.name) = LOWER(?) AND LOWER(r.name) = LOWER(?)"
        )
        price_rows = self._execute_query_in_path(
            price_query, (restaurant_item, restaurant_name), self.initial_state_path
        )
        if not price_rows:
            raise ValueError(
                f"No menu item {restaurant_item!r} found at "
                f"restaurant {restaurant_name!r} in {self.initial_state_path}"
            )

        expected_price = price_rows[0][0]
        logger.info(
            f"Expected price: {expected_price}, "
            f"agent answer: {self.agent_answer!r}"
        )

        return {
            "order_placed": order_placed,
            "correct_item": correct_item,
            "correct_quantity": correct_quantity,
            "answer_matches": float_match(self.agent_answer, expected_price),
        }
