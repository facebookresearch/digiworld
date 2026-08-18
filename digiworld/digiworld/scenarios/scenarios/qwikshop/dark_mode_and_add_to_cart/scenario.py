"""Composed scenario: change to dark mode then add an item to cart."""

import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DarkModeAndAddToCartScenario(QwikshopScenario, ComposableScenario):
    """Verify the agent toggled dark mode on and added an item to the cart.

    Combines change_to_dark_mode (isDarkMode = "true" in rootstore formData)
    + add_item_to_cart (item in cart_items with correct quantity).
    Both are verifiable in the final state.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: verify dark mode is enabled ---
        rootstore_path = os.path.join(state_path, "rootstore.json")
        dark_mode_on = False

        if os.path.exists(rootstore_path):
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)

            # Check all sessions for the formData, since the user may have
            # navigated away from the profile screen after toggling
            for session in rootstore.get("sessionStore", {}).get("sessions", []):
                form_data = (
                    session.get("data", {})
                    .get("sessionData", {})
                    .get("formData", {})
                )
                is_dark = form_data.get("isDarkMode")
                if is_dark is True or str(is_dark).lower() == "true":
                    dark_mode_on = True
                    break

            # Also check current session specifically
            if not dark_mode_on:
                current_session = self.get_current_session(rootstore)
                if current_session:
                    form_data = (
                        current_session.get("data", {})
                        .get("sessionData", {})
                        .get("formData", {})
                    )
                    is_dark = form_data.get("isDarkMode")
                    if is_dark is True or str(is_dark).lower() == "true":
                        dark_mode_on = True

        # --- Part 2: verify item added to cart ---
        cart_query = (
            "SELECT quantity FROM cart_items "
            "WHERE user_id = ? AND LOWER(product_name) = LOWER(?)"
        )

        # Precondition check
        initial_results = self._execute_query_in_path(
            cart_query, (self.current_user_id, self.item), self.initial_state_path
        )
        required_qty = int(self.quantity)
        already_in_cart = initial_results and any(
            row[0] >= required_qty for row in initial_results
        )
        if already_in_cart:
            raise ValueError(
                f"Product '{self.item}' was already in cart with sufficient "
                f"quantity in initial state -- vacuous truth"
            )

        results = self._execute_query_in_path(
            cart_query, (self.current_user_id, self.item), state_path
        )

        item_in_cart = False
        if results:
            item_in_cart = any(row[0] >= required_qty for row in results)

        logger.info(
            "Dark mode + add to cart: dark_mode_on=%s, item_in_cart=%s",
            dark_mode_on, item_in_cart,
        )

        return {
            "dark_mode_on": dark_mode_on,
            "item_in_cart": item_in_cart,
        }
