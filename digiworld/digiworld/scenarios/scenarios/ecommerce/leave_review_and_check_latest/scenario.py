# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class LeaveReviewAndCheckLatestScenario(EcommerceScenario, ComposableScenario):
    """Composed scenario: leave a product review, then report what the
    latest review says for that product.

    Combines verification logic from ``leave_review`` (action) and
    ``latest_review_for_item`` (info-retrieval).  Since the just-posted
    review IS the latest, the agent's answer should contain the
    review_content.
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
                "answer_contains_review": False,
            }

        db_rating, db_title, db_comment = rows[0]
        expected_rating = int(self.star_rating)

        review_created = True
        rating_matches = db_rating == expected_rating
        title_matches = (db_title or "").lower() == self.review_title.lower()

        # -- Latest review answer verification (from latest_review_for_item) -
        # The just-posted review IS the latest, so the agent's answer
        # should contain the review_content.

        answer_ok = substring_match(self.agent_answer, self.review_content)

        logger.info(
            "Leave review & check latest: item='%s', "
            "review_created=%s, rating_matches=%s, title_matches=%s, "
            "agent_answer=%r, answer_contains_review=%s",
            self.item, review_created, rating_matches, title_matches,
            self.agent_answer, answer_ok,
        )

        return {
            "review_created": review_created,
            "rating_matches": rating_matches,
            "title_matches": title_matches,
            "answer_contains_review": answer_ok,
        }
