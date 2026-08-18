# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
import json
import os


class OpenTermsOfUseScenario(RydeScenario, TargetStateScenario):
    """Scenario for opening the Terms of Use page."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has opened the Terms of Use page.
        
        This is verified by checking the session data in rootstore.json
        to see if the user is currently on the Terms of Use screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the Terms of Use page is open, False otherwise.
        """
        
        # Load the rootstore.json to check current session
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
        
        current_session = self.get_current_session(rootstore)
        if not current_session:
            return False
        
        # Check if we're on the Terms of Use screen
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')
        
        # The Terms of Use screen has screenName="Terms of Use" and route="/(tabs)/terms"
        if screen_name == 'Terms of Use' and route == '/(tabs)/terms':
            return True
        
        return False

