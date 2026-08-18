# Copyright (c) Meta Platforms, Inc. and affiliates.
import re

from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario


class AddDeliveryAddressScenario(QwikshopScenario, TargetStateScenario):

    def _normalize_phone(self, phone):
        return re.sub(r'\D', '', phone) if phone else ""

    def _check_task_completion(self, state_path):
        query = """SELECT full_name, street, city, state, pincode, country, phone
                   FROM addresses WHERE user_id = ?"""
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, (self.current_user_id,)
        )
        if not new_records:
            return False

        target_name = f"{self.firstName} {self.lastName}".lower()
        target_street = self.street.lower().strip()
        target_city = self.city.lower()
        target_state = self.state.lower()
        target_pincode = self.zip.lower()
        target_country = self.country.lower()
        target_phone = self._normalize_phone(self.phone)

        for rec in new_records:
            db_name = (rec[0] or "").lower()
            db_street = (rec[1] or "").lower().strip()
            db_city = (rec[2] or "").lower()
            db_state = (rec[3] or "").lower()
            db_pincode = (rec[4] or "").lower()
            db_country = (rec[5] or "").lower()
            db_phone = self._normalize_phone(rec[6] or "")

            if (target_name in db_name or db_name in target_name) and \
               (target_street in db_street or db_street in target_street) and \
               target_city == db_city and target_state == db_state and \
               target_pincode == db_pincode and \
               (target_country in db_country or db_country in target_country) and \
               target_phone == db_phone:
                return True
        return False
