# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: add item to cart then report deals in a category."""

import logging
import unicodedata
from typing import Dict

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddToCartAndShowDealsScenario(QwikshopScenario, ComposableScenario):
    """Verify the agent added an item to cart and reported deals in a category.

    Combines add_item_to_cart (item in cart_items with correct quantity)
    + show_deals_in_category (agent answer lists all matching products).
    """

    @staticmethod
    def _normalize_visible_name(value: str) -> str:
        """Normalize product names to what users can reasonably type from the UI."""
        replacements = {
            "\u2019": "'", "\u2018": "'",
            "\u201c": '"', "\u201d": '"',
            "\u2011": "-", "\u2012": "-", "\u2013": "-", "\u2014": "-",
            "\u202f": " ", "\u00a0": " ", "\u00d7": "x",
        }
        for src, dst in replacements.items():
            value = value.replace(src, dst)
        value = unicodedata.normalize("NFKC", value)
        return " ".join(value.split())

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: verify item added to cart ---
        cart_query = (
            "SELECT quantity FROM cart_items "
            "WHERE user_id = ? AND LOWER(product_name) = LOWER(?)"
        )

        # Precondition: item must NOT already be in the cart at the required qty
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

        # --- Part 2: verify deals answer ---
        threshold = int(self.percentage)
        deals_query = """
            SELECT name FROM products
            WHERE LOWER(category_name) = LOWER(?)
            AND discount_percent >= ?
            AND in_stock = 1
        """
        rows = self._execute_query_in_path(
            deals_query, (self.category, threshold), state_path
        )
        if not rows:
            raise ValueError(
                f"No products found in category '{self.category}' "
                f"with discount >= {threshold}%"
            )
        expected_names = [self._normalize_visible_name(r[0]) for r in rows]
        print(
            f"AddToCartAndShowDeals expected deals for category='{self.category}' "
            f"threshold={threshold}%: {expected_names}"
        )
        deals_reported = all_substrings_match(self.agent_answer, expected_names)

        return {
            "item_in_cart": item_in_cart,
            "deals_reported": deals_reported,
        }
