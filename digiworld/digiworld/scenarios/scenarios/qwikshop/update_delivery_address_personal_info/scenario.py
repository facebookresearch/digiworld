# Copyright (c) Meta Platforms, Inc. and affiliates.
import re

from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class UpdateDeliveryAddressPersonalInfoScenario(QwikshopScenario, TargetStateScenario):

    def _normalize_phone(self, phone):
        return re.sub(r'\D', '', phone) if phone else ""

    def _check_task_completion(self, state_path):
        query = """SELECT full_name, phone FROM addresses
                   WHERE user_id = ? AND LOWER(street) = LOWER(?)
                   AND LOWER(city) = LOWER(?) AND LOWER(state) = LOWER(?)"""
        results = self._execute_query_in_path(
            query, (self.current_user_id, self.street, self.city, self.state), state_path
        )
        if not results:
            raise ValueError(f"Address not found at '{self.street}, {self.city}, {self.state}' in final state")

        target_name = f"{self.firstName} {self.lastName}".lower()
        target_phone = self._normalize_phone(self.phone)

        for rec in results:
            db_name = (rec[0] or "").lower()
            db_phone = self._normalize_phone(rec[1] or "")
            if (target_name in db_name or db_name in target_name) and target_phone == db_phone:
                return True
        return False
