# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario


class AddNewAddressScenario(EatsScenario, TargetStateScenario):
    """Scenario for adding a new address to the user's account."""
    
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
        SELECT id, user_id, label, address_line_1, address_line_2, city, state, postal_code, country
        FROM user_addresses
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
        target_address_line1 = self.address_line1.lower().strip()
        target_address_line2 = (self.address_line2 or "").lower().strip()
        target_city = self.city.lower()
        target_state = self.state.lower()
        target_postcode = self.postcode.lower()
        target_country = self.country.lower()
        target_label = self.label
        
        for new_address in new_addresses:
            # Extract fields from the new address tuple
            # Tuple format: (id, userId, label, addressLine1, addressLine2, city, state, postalCode, country)
            db_label = new_address[2] if new_address[2] else ""
            db_address_line1 = new_address[3].lower().strip() if new_address[3] else ""
            db_address_line2 = (new_address[4] or "").lower().strip()
            db_city = new_address[5].lower() if new_address[5] else ""
            db_state = new_address[6].lower() if new_address[6] else ""
            db_postcode = new_address[7].lower() if new_address[7] else ""
            db_country = new_address[8].lower() if new_address[8] else ""
            
            # Check if all required fields match
            label_matches = target_label == db_label
            address_line1_matches = target_address_line1 in db_address_line1 or db_address_line1 in target_address_line1
            
            # Address line 2 is optional - if both are empty, consider it a match
            if not target_address_line2 and not db_address_line2:
                address_line2_matches = True
            else:
                address_line2_matches = target_address_line2 in db_address_line2 or db_address_line2 in target_address_line2
            
            city_matches = target_city == db_city
            state_matches = target_state == db_state
            postcode_matches = target_postcode == db_postcode
            country_matches = target_country in db_country or db_country in target_country
            
            if (label_matches and address_line1_matches and address_line2_matches and 
                city_matches and state_matches and postcode_matches and country_matches):
                return True
        
        return False
