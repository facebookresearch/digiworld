# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: add item to cart, then report estimated order time."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddToCartAndCheckTimeScenario(EatsScenario, ComposableScenario):
    """Verify item was added to cart and the agent reports estimated time."""

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

        # --- Estimated time check (from check_estimated_order_time) ---
        restaurant = getattr(self, "restaurant", None)
        if not restaurant:
            raise ValueError("restaurant parameter is required")

        expected_minutes = 20
        logger.info(
            f"Expected delivery time: {expected_minutes} min, "
            f"agent answer: {self.agent_answer!r}"
        )

        return {
            "item_in_cart": item_in_cart,
            "answer_matches": numeric_match(self.agent_answer, expected_minutes),
        }
