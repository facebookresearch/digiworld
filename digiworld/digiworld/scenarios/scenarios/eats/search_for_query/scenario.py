# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario


class SearchForQueryScenario(EatsScenario, TargetStateScenario):
    """Scenario for searching for restaurants or food items using a search query."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the search screen and entered the query.
        
        This is verified by:
        1. Checking if the user is on the Search screen
        2. Verifying that the search query in the session matches the target query
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the search query has been entered, False otherwise.
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
        
        # Check if we're on the Search screen
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')
        
        # The Search screen has screenName="SearchScreen" and route="/screens/search"
        if screen_name != 'SearchScreen' or route != '/screens/search':
            return False
        
        # Get the search query from the session data
        # trackContentChange stores data in sessionData.formData
        session_data = current_session.get('data', {}).get('sessionData', {})
        form_data = session_data.get('formData', {})
        current_search_query = form_data.get('searchQuery', '')
        
        # Compare with the target query (case-insensitive)
        target_query = self.query.lower().strip()
        current_query_normalized = current_search_query.lower().strip() if current_search_query else ''
        
        # Check if the search query matches
        if current_query_normalized == target_query:
            return True
        
        return False
