# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario
import json
import os


class ViewMyBidsScenario(AuctionScenario, TargetStateScenario):
    """Scenario for viewing the user's bids on auction items."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the My Bids screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if the My Bids screen is displayed, False otherwise.
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
        
        # Check for bids-related screens
        if 'bid' in screen_name or 'bid' in route:
            return True
        if 'my bids' in screen_name or '/bids' in route:
            return True
        
        return False
