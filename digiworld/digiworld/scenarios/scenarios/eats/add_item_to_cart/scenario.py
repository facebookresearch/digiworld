# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for adding a menu item to the cart."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddItemToCartScenario(EatsScenario, ComposableScenario):
    """Verify that the agent added the specified menu item to the cart."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
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

        return {"item_in_cart": item_in_cart}
