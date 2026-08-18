# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import get_product_spec_value
from digiworld.scenarios.answer_matchers import substring_match


class SnackWeightScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        expected = get_product_spec_value(self, state_path, self.item, "weight")
        return {"answer_correct": substring_match(self.agent_answer, expected)}
