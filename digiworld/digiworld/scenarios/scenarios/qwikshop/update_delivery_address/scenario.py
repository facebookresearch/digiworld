# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class UpdateDeliveryAddressScenario(QwikshopScenario, TargetStateScenario):

    def _check_task_completion(self, state_path):
        query = """SELECT street, city, state, pincode, country
                   FROM addresses WHERE user_id = ?"""
        results = self._execute_query_in_path(query, (self.current_user_id,), state_path)

        new_target = (self.street2.lower().strip(), self.city2.lower(),
                      self.state2.lower(), self.zip2.lower(), self.country2.lower())

        return any(
            (r[0] or "").lower().strip() == new_target[0] and
            (r[1] or "").lower() == new_target[1] and
            (r[2] or "").lower() == new_target[2] and
            (r[3] or "").lower() == new_target[3] and
            (r[4] or "").lower() == new_target[4]
            for r in results
        )
