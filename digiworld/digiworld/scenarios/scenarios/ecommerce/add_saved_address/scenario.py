# Copyright (c) Meta Platforms, Inc. and affiliates.
import re
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ecommerce.base_scenario import EcommerceScenario


class AddSavedAddressScenario(EcommerceScenario, TargetStateScenario):
    """Scenario for adding a new saved address to the user's account."""

    # def _normalize_phone(self, phone: str) -> str:
    #     """Extract only digits from phone number for comparison."""
    #     if not phone:
    #         return ""
    #     # Remove all non-digit characters
    #     return re.sub(r'\D', '', phone)

    def _normalize_phone(self, phone: str) -> str:
        """Normalize US phone numbers for comparison."""
        if not phone:
            return ""
        digits = re.sub(r'\D', '', phone)
        if len(digits) == 11 and digits.startswith("1"):
            return digits[1:]
        return digits

    def _check_task_completion(self, state_path):
        """
        Check if a new address has been added to the user's account.

        This is verified by checking the database to see if a new address record
        was created for the current user with the specified details.

        Args:
            state_path: The path to the current state to verify.

        Returns:
            bool: True if the address has been added, False otherwise.
        """

        # Query to get all addresses for the current user
        query = """
        SELECT id, user_id, full_name, street, city, state, pincode, country, phone
        FROM addresses
        WHERE user_id = ?
        ORDER BY created_at DESC
        """

        # Compare the addresses between initial and current state
        initial_addresses, current_addresses, new_addresses = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id,)
        )

        # If no new addresses were added, task is not complete
        if len(new_addresses) == 0:
            return False

        # Check if any of the new addresses match our target address
        # Convert the address parameters to match the database format
        target_full_name = f"{self.first_name} {self.last_name}".lower()
        target_street = self.address_line_1.lower().strip()
        target_city = self.city.lower()
        target_state = self.state.lower()
        target_pincode = self.postal_code.lower()
        target_country = self.country.lower()
        target_phone_normalized = self._normalize_phone(self.phone_number)

        for new_address in new_addresses:
            # Extract fields from the new address tuple
            # Tuple format: (id, user_id, full_name, street, city, state, pincode, country, phone)
            db_full_name = new_address[2].lower() if new_address[2] else ""
            db_street = new_address[3].lower().strip() if new_address[3] else ""
            db_city = new_address[4].lower() if new_address[4] else ""
            db_state = new_address[5].lower() if new_address[5] else ""
            db_pincode = new_address[6].lower() if new_address[6] else ""
            db_country = new_address[7].lower() if new_address[7] else ""
            db_phone = new_address[8] if new_address[8] else ""
            db_phone_normalized = self._normalize_phone(db_phone)

            # Check if all required fields match
            # We use "in" for fullName to allow for flexible matching (e.g., "John Doe" contains both "John" and "Doe")
            name_matches = (target_full_name in db_full_name or db_full_name in target_full_name)
            street_matches = target_street in db_street or db_street in target_street
            city_matches = target_city == db_city
            state_matches = target_state == db_state
            pincode_matches = target_pincode == db_pincode
            country_matches = target_country in db_country or db_country in target_country
            # Compare phone numbers by digits only (handles different formatting like (555) 123-4567 vs 555-123-4567)
            phone_matches = target_phone_normalized == db_phone_normalized

            if name_matches and street_matches and city_matches and state_matches and pincode_matches and country_matches and phone_matches:
                return True

        return False
