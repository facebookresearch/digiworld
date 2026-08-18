# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.answer_matchers import date_match


class LatestReviewDateScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            "SELECT r.review_date FROM reviews r "
            "JOIN products p ON r.product_id = p.id "
            "WHERE p.name = ? AND r.parent_review_id IS NULL "
            "ORDER BY r.review_date DESC LIMIT 1",
            (self.item,),
            state_path,
        )
        if not rows:
            raise ValueError(f"No reviews found for product '{self.item}'")
        review_date_str = rows[0][0]
        return {"answer_contains_date": date_match(self.agent_answer, review_date_str)}
