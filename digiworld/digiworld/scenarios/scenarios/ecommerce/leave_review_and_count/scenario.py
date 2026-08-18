# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class LeaveReviewAndCountScenario(EcommerceScenario, ComposableScenario):
    """Composed scenario: leave a product review, then report the total
    number of reviews for that product.

    Combines verification logic from ``leave_review`` (action) and
    ``count_reviews_for_item`` (info-retrieval).  The expected count is
    the initial review_count + 1 (the review just posted).
    """

    def _get_checks(self, state_path):
        product = query_product_by_name(self, state_path, self.item)

        # -- Review creation verification (from leave_review) ---------------

        rows = self._execute_query_in_path(
            "SELECT rating, title, comment FROM reviews "
            "WHERE product_id = ? AND user_id = ? "
            "ORDER BY created_at DESC LIMIT 1",
            (product["id"], self.current_user_id),
            state_path,
        )

        if not rows:
            return {
                "review_created": False,
                "rating_matches": False,
                "title_matches": False,
                "answer_matches_count": False,
            }

        db_rating, db_title, db_comment = rows[0]
        expected_rating = int(self.star_rating)

        review_created = True
        rating_matches = db_rating == expected_rating
        title_matches = (db_title or "").lower() == self.review_title.lower()

        # -- Count verification (from count_reviews_for_item) ---------------
        # Expected count = initial review_count + 1

        initial_product = query_product_by_name(
            self, self.initial_state_path, self.item
        )
        initial_review_count = initial_product["review_count"]
        expected_count = initial_review_count + 1

        answer_ok = numeric_match(self.agent_answer, expected_count)

        logger.info(
            "Leave review & count: item='%s', review_created=%s, "
            "rating_matches=%s, title_matches=%s, "
            "initial_review_count=%d, expected_count=%d, "
            "agent_answer=%r, answer_ok=%s",
            self.item, review_created, rating_matches, title_matches,
            initial_review_count, expected_count,
            self.agent_answer, answer_ok,
        )

        return {
            "review_created": review_created,
            "rating_matches": rating_matches,
            "title_matches": title_matches,
            "answer_matches_count": answer_ok,
        }
