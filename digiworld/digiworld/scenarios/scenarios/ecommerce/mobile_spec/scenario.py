# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import get_product_spec_value
from digiworld.scenarios.answer_matchers import substring_match

_SPEC_KEY_MAP = {
    "display": "display",
    "processor": "processor",
    "RAM": "ram",
    "storage": "storage",
    "camera": "camera",
    "battery": "battery",
    "OS": "os",
}


class MobileSpecScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        spec_key = _SPEC_KEY_MAP.get(self.spec, self.spec.lower())
        expected = get_product_spec_value(self, state_path, self.item, spec_key)
        return {"answer_correct": substring_match(self.agent_answer, expected)}
