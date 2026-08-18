"""Composed scenario: add a payment method then add a delivery address."""

import re
import logging
from typing import Dict

from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddPaymentAndAddressScenario(QwikshopScenario, ComposableScenario):
    """Verify the agent added both a payment method and a delivery address.

    Combines add_payment_method (new payment_methods record with matching
    card details) + add_delivery_address (new addresses record with
    matching fields).
    """

    @staticmethod
    def _normalize_phone(phone):
        return re.sub(r'\D', '', phone) if phone else ""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: verify payment method was added ---
        pay_query = (
            "SELECT name_on_card, card_number "
            "FROM payment_methods WHERE user_id = ?"
        )
        initial_records, current_records, new_pay_records = (
            self.compare_database_records(
                self.initial_state_path, state_path, pay_query,
                (self.current_user_id,)
            )
        )

        card_number = str(self.cardNumber).replace(" ", "").replace("-", "")
        last4 = card_number[-4:]
        target_name = str(self.cardName).lower()

        payment_added = False
        for record in new_pay_records:
            rec_name = str(record[0]).lower()
            rec_card = str(record[1]).replace(" ", "").replace("-", "")
            if rec_card.endswith(last4) and rec_name == target_name:
                payment_added = True
                break

        # --- Part 2: verify delivery address was added ---
        addr_query = """SELECT full_name, street, city, state, pincode, country, phone
                        FROM addresses WHERE user_id = ?"""
        initial_records, current_records, new_addr_records = (
            self.compare_database_records(
                self.initial_state_path, state_path, addr_query,
                (self.current_user_id,)
            )
        )

        target_full_name = f"{self.firstName} {self.lastName}".lower()
        target_street = self.street.lower().strip()
        target_city = self.city.lower()
        target_state = self.state.lower()
        target_pincode = self.zip.lower()
        target_country = self.country.lower()
        target_phone = self._normalize_phone(self.phone)

        address_added = False
        for rec in new_addr_records:
            db_name = (rec[0] or "").lower()
            db_street = (rec[1] or "").lower().strip()
            db_city = (rec[2] or "").lower()
            db_state = (rec[3] or "").lower()
            db_pincode = (rec[4] or "").lower()
            db_country = (rec[5] or "").lower()
            db_phone = self._normalize_phone(rec[6] or "")

            if ((target_full_name in db_name or db_name in target_full_name)
                    and (target_street in db_street or db_street in target_street)
                    and target_city == db_city
                    and target_state == db_state
                    and target_pincode == db_pincode
                    and (target_country in db_country or db_country in target_country)
                    and target_phone == db_phone):
                address_added = True
                break

        logger.info(
            "Add payment + address: payment_added=%s, address_added=%s",
            payment_added, address_added,
        )

        return {
            "payment_added": payment_added,
            "address_added": address_added,
        }
