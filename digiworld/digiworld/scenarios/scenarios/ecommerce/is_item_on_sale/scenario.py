# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name
from digiworld.scenarios.answer_matchers import boolean_match, numeric_match


class IsItemOnSaleScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        product = query_product_by_name(self, state_path, self.item)
        discount_percent = product["discount_percent"]
        on_sale = discount_percent > 0
        checks = {
            "is_on_sale": boolean_match(self.agent_answer, on_sale),
        }
        if on_sale:
            checks["discount_correct"] = numeric_match(
                self.agent_answer, discount_percent
            )
        else:
            checks["discount_correct"] = True
        return checks
