# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
import json
import os


class ViewMyTransactionsScenario(BankingScenario, TargetStateScenario):
    """Scenario for viewing the user's transactions list."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the transactions list screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if on the transactions list screen, False otherwise.
        """
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
            
        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False
            
        screen_name = current_session.get('data', {}).get('screenName', '').lower()
        route = current_session.get('data', {}).get('route', '').lower()
        
        # Check if on transactions list screen (not details)
        if 'transaction' in screen_name and 'detail' not in screen_name:
            return True
        if route == '/transactions' or route.endswith('/transactions'):
            return True
            
        return False
