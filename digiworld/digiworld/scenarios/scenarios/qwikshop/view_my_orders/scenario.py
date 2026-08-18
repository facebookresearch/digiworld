# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.qwikshop.base_scenario import QwikshopScenario
import json
import os


class ViewMyOrdersScenario(QwikshopScenario, TargetStateScenario):
    """Scenario for viewing the user's order history."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the My Orders screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing orders list, False otherwise.
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
        
        # Check for orders-related screens
        if 'order' in screen_name or 'order' in route:
            return True
        if 'purchase' in screen_name or 'purchase' in route:
            return True
        if 'my orders' in screen_name or '/orders' in route:
            return True
        
        return False
