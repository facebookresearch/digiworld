# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario


class SetMonthlyTransactionLimitScenario(PaymentScenario, TargetStateScenario):
    """Scenario for setting a monthly transaction limit."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has set the monthly transaction limit to the specified amount.
        
        This is verified by checking the database to see if the user's monthly limit
        has been changed to the target amount.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the monthly limit has been set to the target amount, False otherwise.
        """
        
        # Query to get the current user's monthly limit
        query = """
        SELECT monthly_limit FROM users
        WHERE id = ?
        """
        
        # Compare the monthly limit between initial and current state
        initial_limits, current_limits, _ = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id,)
        )
        
        # Extract the target amount (remove any formatting characters)
        target_amount = float(self.amount.replace('$', '').replace(',', ''))
        
        # Check if the current monthly limit matches the target amount
        # current_limits is a set, so convert to list to access elements
        if current_limits:
            current_limits_list = list(current_limits)
            current_limit = float(current_limits_list[0][0])
            return abs(current_limit - target_amount) < 0.01  # Allow for floating point precision
        
        return False


