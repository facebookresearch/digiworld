# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
import json
import os


class ViewTransactionHistoryScenario(PaymentScenario, TargetStateScenario):
    """Scenario for viewing the transaction history screen."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the transaction history screen.
        
        This is verified by checking the session data in rootstore.json
        to see if the user is currently on the transactions screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the user is on the transactions screen, False otherwise.
        """
        
        # Load the rootstore.json to check current session
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
        
        # Get the current session from sessionStore
        current_session = rootstore.get('sessionStore', {}).get('session', {})
        if not current_session:
            return False
        
        # Check if we're on the transactions screen
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')
        
        # The transactions screen has screenName="Transactions" and route="/(tabs)/transactions"
        if screen_name == 'Transactions' and route == '/(tabs)/transactions':
            return True
        
        return False

