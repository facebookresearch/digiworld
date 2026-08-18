# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name
from digiworld.scenarios.answer_matchers import float_match


class HomeKitchenCurrentPriceScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        product = query_product_by_name(self, state_path, self.item)
        current_price = (
            product["discounted_price"]
            if product["discounted_price"]
            else product["price"]
        )
        return {
            "answer_correct": float_match(self.agent_answer, current_price),
        }
