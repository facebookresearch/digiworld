# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
import json
import os


class ViewSavedRoutesScenario(TransitScenario, TargetStateScenario):
    """Scenario for viewing the user's saved transit routes."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the Saved Routes screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing saved routes, False otherwise.
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
        
        # Check for saved routes screens
        if 'saved' in screen_name and 'route' in screen_name:
            return True
        if '/saved' in route or 'savedroutes' in route:
            return True
        if 'favorite' in screen_name or 'favorite' in route:
            return True
        if 'my routes' in screen_name:
            return True
        
        return False
