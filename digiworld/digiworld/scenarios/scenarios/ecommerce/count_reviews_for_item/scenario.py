# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name
from digiworld.scenarios.answer_matchers import numeric_match


class CountReviewsForItemScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        product = query_product_by_name(self, state_path, self.item)
        expected_count = product["review_count"]
        return {
            "answer_correct": numeric_match(self.agent_answer, expected_count),
        }
