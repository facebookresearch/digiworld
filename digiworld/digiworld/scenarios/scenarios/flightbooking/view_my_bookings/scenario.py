# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
import json
import os


class ViewMyBookingsScenario(FlightBookingScenario, TargetStateScenario):
    """Scenario for viewing the user's flight bookings."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the My Bookings screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing bookings list, False otherwise.
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
        
        # The My Trips tab uses screenName 'tickets' and route '/tickets'
        if screen_name == 'tickets' or route == '/tickets':
            return True
        
        return False
