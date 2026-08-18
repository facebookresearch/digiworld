"""Composed scenario: add a delivery address then set it as default."""

import re
from typing import Dict

from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import ComposableScenario


class AddAddressAndSetDefaultScenario(QwikshopScenario, ComposableScenario):
    """Verify that the agent added a delivery address and set it as default.

    Combines add_delivery_address (new address in addresses table)
    + set_default_delivery_address (is_default = 1 on that address).
    """

    @staticmethod
    def _normalize_phone(phone):
        return re.sub(r'\D', '', phone) if phone else ""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # Check 1: address was created (new record compared to initial)
        list_query = """SELECT full_name, street, city, state, pincode, country, phone
                        FROM addresses WHERE user_id = ?"""
        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, list_query, (self.current_user_id,)
        )

        target_name = f"{self.firstName} {self.lastName}".lower()
        target_street = self.street.lower().strip()
        target_city = self.city.lower()
        target_state = self.state.lower()
        target_pincode = self.zip.lower()
        target_country = self.country.lower()
        target_phone = self._normalize_phone(self.phone)

        address_created = False
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
                address_created = True
                break

        # Check 2: the address is set as default.
        # Use TRIM on street because the app builds street as
        # "${addressLine1} ${addressLine2}" — when addressLine2 is blank this
        # produces a trailing space that breaks exact matching.
        # Country is excluded because the agent may type "US" vs "United States".
        default_query = """SELECT is_default FROM addresses
                           WHERE user_id = ?
                           AND LOWER(TRIM(street)) LIKE LOWER(TRIM(?)) || '%'
                           AND LOWER(city) = LOWER(?)
                           AND LOWER(state) = LOWER(?)
                           AND LOWER(pincode) = LOWER(?)"""
        default_results = self._execute_query_in_path(
            default_query,
            (self.current_user_id, self.street, self.city, self.state, self.zip),
            state_path
        )

        is_default = False
        if default_results:
            is_default = any(bool(row[0]) for row in default_results)

        return {
            "address_created": address_created,
            "is_default": is_default,
        }
