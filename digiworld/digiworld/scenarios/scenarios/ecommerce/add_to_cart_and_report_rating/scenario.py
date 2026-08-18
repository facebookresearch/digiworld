import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddToCartAndReportRatingScenario(EcommerceScenario, ComposableScenario):
    """Composed scenario: add an item to the cart, then report
    its star rating.

    Combines verification logic from ``add_item_to_cart`` (action) and
    ``item_star_rating`` (info-retrieval).  The agent must both add the
    item to the cart *and* correctly report the product's star rating.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # -- Cart addition verification (from add_item_to_cart) ----------------

        cart_query = """
        SELECT ci.product_name FROM cart_items ci
        JOIN carts c ON ci.cart_id = c.id
        WHERE c.user_id = ?
        """
        initial_items, current_items, new_items = self.compare_database_records(
            self.initial_state_path, state_path, cart_query,
            (self.current_user_id,)
        )
        target = self.item.lower()
        added_names = [row[0].lower() for row in new_items]
        item_added = any(target in n or n in target for n in added_names)

        # -- Star rating verification (from item_star_rating) ------------------

        product = query_product_by_name(self, state_path, self.item)
        expected_rating = product["rating"]
        answer_ok = float_match(self.agent_answer, expected_rating)

        logger.info(
            "Add to cart & report rating: item='%s', item_added=%s, "
            "expected_rating=%s, agent_answer=%r, answer_ok=%s",
            self.item, item_added, expected_rating,
            self.agent_answer, answer_ok,
        )

        return {
            "item_added": item_added,
            "rating_answer_correct": answer_ok,
        }
