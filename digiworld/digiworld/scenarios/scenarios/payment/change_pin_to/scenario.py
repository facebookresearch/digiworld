# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario


class ChangePinToScenario(PaymentScenario, TargetStateScenario):
    """Scenario for changing transaction PIN to a new specified PIN."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has changed their transaction PIN to the specified new PIN.
        
        This is verified by checking the database to see if the user's PIN
        has been changed to the target PIN.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the PIN has been changed to the target PIN, False otherwise.
        """
        
        # Query to get the current user's PIN
        query = """
        SELECT pin FROM users
        WHERE id = ?
        """
        
        # Compare the PIN between initial and current state
        initial_pins, current_pins, _ = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id,)
        )
        
        # Extract the target PIN
        target_pin = str(self.pin)
        
        # Check if the current PIN matches the target PIN
        # current_pins is a set, so convert to list to access elements
        if current_pins:
            current_pins_list = list(current_pins)
            current_pin = str(current_pins_list[0][0])
            return current_pin == target_pin
        
        return False

