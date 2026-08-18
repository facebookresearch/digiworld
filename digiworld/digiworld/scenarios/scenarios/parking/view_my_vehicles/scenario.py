# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario
import json
import os


class ViewMyVehiclesScenario(ParkingScenario, TargetStateScenario):
    """Scenario for viewing the user's registered vehicles."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the My Vehicles screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing vehicles list, False otherwise.
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
        
        # Check for vehicles-related screens
        if 'vehicle' in screen_name or 'vehicle' in route:
            return True
        if 'my cars' in screen_name or '/cars' in route:
            return True
        if 'garage' in screen_name or 'garage' in route:
            return True
        
        return False
