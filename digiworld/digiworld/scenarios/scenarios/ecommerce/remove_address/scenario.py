# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class RemoveAddressScenario(EcommerceScenario, ComposableScenario):
    """Scenario for removing a saved address from the user's account."""

    def _get_checks(self, state_path):
        query = "SELECT street FROM addresses WHERE user_id = ?"
        # Check that the address existed in the initial state
        initial_rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        initial_streets = " ".join((r[0] or "").lower() for r in initial_rows)

        rows = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        remaining = " ".join((r[0] or "").lower() for r in rows)
        return {
            "address_existed_initially": self.street_address.lower() in initial_streets,
            "address_removed": self.street_address.lower() not in remaining,
        }
