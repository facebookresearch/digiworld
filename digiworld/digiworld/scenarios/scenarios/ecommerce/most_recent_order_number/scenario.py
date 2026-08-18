# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.answer_matchers import substring_match


class MostRecentOrderNumberScenario(EcommerceScenario, ComposableScenario):
    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            "SELECT order_number FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
            (self.current_user_id,),
            state_path,
        )
        if not rows:
            raise ValueError("No orders found for current user")
        expected_order_number = rows[0][0]
        return {"answer_contains_order_number": substring_match(self.agent_answer, expected_order_number)}
