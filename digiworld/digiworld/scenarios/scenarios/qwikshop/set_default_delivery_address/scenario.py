# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class SetDefaultDeliveryAddressScenario(QwikshopScenario, TargetStateScenario):

    def _check_task_completion(self, state_path):
        query = """SELECT is_default FROM addresses
                   WHERE user_id = ? AND LOWER(street) = LOWER(?)
                   AND LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?)
                   AND LOWER(pincode) = LOWER(?) AND LOWER(country) = LOWER(?)"""
        results = self._execute_query_in_path(
            query,
            (self.current_user_id, self.street, self.city, self.state, self.zip, self.country),
            state_path
        )
        if not results:
            raise ValueError("Address not found in final state")
        return results[0][0] == 1
