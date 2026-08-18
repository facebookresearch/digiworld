# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class DeleteDeliveryAddressScenario(QwikshopScenario, TargetStateScenario):

    def _check_task_completion(self, state_path):
        query = """SELECT street, city, state, pincode, country
                   FROM addresses WHERE user_id = ?"""
        initial_records, current_records, _ = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )

        target = (self.street.lower().strip(), self.city.lower(),
                  self.state.lower(), self.zip.lower(), self.country.lower())

        found_initial = any(
            (r[0] or "").lower().strip() == target[0] and
            (r[1] or "").lower() == target[1] and
            (r[2] or "").lower() == target[2] and
            (r[3] or "").lower() == target[3] and
            (r[4] or "").lower() == target[4]
            for r in initial_records
        )
        if not found_initial:
            raise ValueError(f"Address not found in initial state: {target}")

        found_final = any(
            (r[0] or "").lower().strip() == target[0] and
            (r[1] or "").lower() == target[1] and
            (r[2] or "").lower() == target[2] and
            (r[3] or "").lower() == target[3] and
            (r[4] or "").lower() == target[4]
            for r in current_records
        )
        return not found_final
