# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class SetDefaultAddressScenario(EcommerceScenario, ComposableScenario):
    """Scenario for setting a saved address as the default."""

    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            "SELECT street, is_default FROM addresses WHERE user_id = ?",
            (self.current_user_id,),
            state_path,
        )
        target = self.street_address.lower().strip()
        for street, is_default in rows:
            if target in (street or "").lower():
                return {"address_set_as_default": bool(is_default)}
        raise ValueError(
            f"Address with street '{self.street_address}' not found"
        )
