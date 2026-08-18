# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.scenarios.ecommerce.shared import query_product_by_name
from digiworld.scenarios.answer_matchers import substring_match


class HomeKitchenAboutItemScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        product = query_product_by_name(self, state_path, self.item)
        description = product["description"]
        # Trim to first 50 characters at a word boundary
        snippet = description[:50].rsplit(" ", 1)[0] if len(description) > 50 else description
        return {"answer_correct": substring_match(self.agent_answer, snippet)}
