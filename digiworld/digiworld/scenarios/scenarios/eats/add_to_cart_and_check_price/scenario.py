# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: add item to cart, then report its price."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddToCartAndCheckPriceScenario(EatsScenario, ComposableScenario):
    """Verify item was added to cart and the agent reports its price."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Cart check (from add_item_to_cart) ---
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        cart_items = rootstore.get("cartStore", {}).get("items", [])
        target_name = self.restaurant_item.lower()

        item_in_cart = any(
            item.get("menuItem", {}).get("name", "").lower() == target_name
            for item in cart_items
        )

        # --- Price check (from check_item_price) ---
        restaurant = getattr(self, "restaurant", None)
        restaurant_item = getattr(self, "restaurant_item", None)
        if not restaurant:
            raise ValueError("restaurant parameter is required")
        if not restaurant_item:
            raise ValueError("restaurant_item parameter is required")

        query = (
            "SELECT mi.price "
            "FROM menu_items mi "
            "JOIN restaurants r ON mi.restaurant_id = r.id "
            "WHERE LOWER(mi.name) = LOWER(?) AND LOWER(r.name) = LOWER(?)"
        )
        rows = self._execute_query_in_path(
            query, (restaurant_item, restaurant), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No menu item {restaurant_item!r} found at "
                f"restaurant {restaurant!r} in {self.initial_state_path}"
            )

        expected_price = rows[0][0]
        logger.info(
            f"Expected price: {expected_price}, "
            f"agent answer: {self.agent_answer!r}"
        )

        return {
            "item_in_cart": item_in_cart,
            "answer_matches": float_match(self.agent_answer, expected_price),
        }
