import re
import logging
from typing import Dict

from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddAddressAndSetDefaultScenario(EcommerceScenario, ComposableScenario):
    """Composed scenario: add a new saved address, then set it as the
    default delivery address.

    Combines verification logic from ``add_saved_address`` (action) and
    ``set_default_address`` (action).  Both steps leave persistent traces:
    the address exists in the database *and* its ``is_default`` flag is set.
    """

    @staticmethod
    def _normalize_phone(phone: str) -> str:
        if not phone:
            return ""
        return re.sub(r"\D", "", phone)

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # -- Address creation verification (from add_saved_address) ------------

        query = """
        SELECT id, user_id, full_name, street, city, state, pincode,
               country, phone, is_default
        FROM addresses
        WHERE user_id = ?
        ORDER BY created_at DESC
        """
        initial_addrs, current_addrs, new_addrs = self.compare_database_records(
            self.initial_state_path, state_path, query,
            (self.current_user_id,)
        )

        if not new_addrs:
            return {
                "address_created": False,
                "address_details_match": False,
                "address_set_as_default": False,
            }

        target_full_name = f"{self.first_name} {self.last_name}".lower()
        target_street = self.address_line_1.lower().strip()
        target_city = self.city.lower()
        target_state = self.state.lower()
        target_pincode = self.postal_code.lower()
        target_country = self.country.lower()
        target_phone = self._normalize_phone(self.phone_number)

        address_created = False
        address_details_match = False
        address_is_default = False

        for addr in new_addrs:
            db_full_name = (addr[2] or "").lower()
            db_street = (addr[3] or "").lower().strip()
            db_city = (addr[4] or "").lower()
            db_state = (addr[5] or "").lower()
            db_pincode = (addr[6] or "").lower()
            db_country = (addr[7] or "").lower()
            db_phone = self._normalize_phone(addr[8] or "")
            db_is_default = addr[9]

            name_ok = (
                target_full_name in db_full_name
                or db_full_name in target_full_name
            )
            street_ok = (
                target_street in db_street or db_street in target_street
            )
            city_ok = target_city == db_city
            state_ok = target_state == db_state
            pincode_ok = target_pincode == db_pincode
            country_ok = (
                target_country in db_country or db_country in target_country
            )
            phone_ok = target_phone == db_phone

            if (name_ok and street_ok and city_ok and state_ok
                    and pincode_ok and country_ok and phone_ok):
                address_created = True
                address_details_match = True
                address_is_default = bool(db_is_default)
                break

        # If the address was created but is_default wasn't on the new record,
        # check if any address with that street is now default (agent may have
        # set it via a separate operation).
        if address_created and not address_is_default:
            default_query = (
                "SELECT is_default FROM addresses "
                "WHERE user_id = ? AND LOWER(street) LIKE ?"
            )
            rows = self._execute_query_in_path(
                default_query,
                (self.current_user_id, f"%{target_street}%"),
                state_path,
            )
            address_is_default = any(row[0] for row in rows)

        logger.info(
            "Add address & set default: address_created=%s, "
            "details_match=%s, is_default=%s",
            address_created, address_details_match, address_is_default,
        )

        return {
            "address_created": address_created,
            "address_details_match": address_details_match,
            "address_set_as_default": address_is_default,
        }
