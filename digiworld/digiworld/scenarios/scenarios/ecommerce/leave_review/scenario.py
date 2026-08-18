# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name


class LeaveReviewScenario(EcommerceScenario, ComposableScenario):
    """Scenario for leaving a product review."""

    def _get_checks(self, state_path):
        product = query_product_by_name(self, state_path, self.item)

        rows = self._execute_query_in_path(
            "SELECT rating, title, comment FROM reviews "
            "WHERE product_id = ? AND user_id = ? "
            "ORDER BY created_at DESC LIMIT 1",
            (product["id"], self.current_user_id),
            state_path,
        )

        if not rows:
            return {"review_created": False}

        db_rating, db_title, db_comment = rows[0]
        expected_rating = int(self.star_rating)

        return {
            "review_created": True,
            "rating_matches": db_rating == expected_rating,
            "title_matches": (db_title or "").lower() == self.review_title.lower(),
        }
