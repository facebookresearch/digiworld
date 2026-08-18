# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class RemovePaymentMethodScenario(EcommerceScenario, ComposableScenario):
    """Scenario for removing a payment method from the user's account."""

    def _get_checks(self, state_path):
        query = "SELECT name_on_card FROM payment_methods WHERE user_id = ?"
        # Check that the payment method existed in the initial state
        initial_rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        initial_names = [r[0].lower() for r in initial_rows if r[0]]

        rows = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        remaining = [r[0].lower() for r in rows if r[0]]
        return {
            "payment_existed_initially": self.name_on_card.lower() in initial_names,
            "payment_removed": self.name_on_card.lower() not in remaining,
        }
