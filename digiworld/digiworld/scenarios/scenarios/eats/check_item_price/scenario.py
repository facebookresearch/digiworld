# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckItemPriceScenario(EatsScenario, ComposableScenario):
    """Verify that the agent correctly reports a menu item's price."""

    def _get_checks(self, state_path):
        restaurant_item = getattr(self, "restaurant_item", None)
        restaurant = getattr(self, "restaurant", None)
        if not restaurant_item:
            raise ValueError("restaurant_item parameter is required")
        if not restaurant:
            raise ValueError("restaurant parameter is required")

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
            "answer_matches": float_match(self.agent_answer, expected_price),
        }
