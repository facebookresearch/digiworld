# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario, _normalize_location


class BookRideWithCarTypeScenario(RydeScenario, TargetStateScenario):
    """Scenario for booking a ride from one location to another with a specific car type."""
    
    def _check_task_completion(self, state_path):
        """
        Check if a ride has been booked from origin to destination with the specified car type.
        
        Since rides are only persisted to the database after driver assignment,
        we check the UI state (rootstore.json) to see if a currentRide exists
        with the matching source, destination, and car type.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if a ride with matching locations and car type is booked, False otherwise.
        """
        
        # Load the rootstore.json to check current ride state
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            return False
            
        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)
        
        # Get the ride store state
        ride_store = rootstore.get('rideStore', {})
        
        # Check if there's a current ride
        current_ride = ride_store.get('currentRide')
        if not current_ride:
            return False
        
        # Get the source and destination from the current ride
        source = current_ride.get('source', '')
        destination = current_ride.get('destination', '')
        
        # Get the ride option (car type) from the rideStore (not from currentRide)
        # The car type is stored as currentRideOption in the rideStore, e.g., "sedan", "suv"
        current_ride_option = ride_store.get('currentRideOption', '')
        
        status = current_ride.get('status', '')
        valid_statuses = ['booked', 'driver-assigned', 'started', 'ongoing',
                          'confirmed', 'pending', 'accepted', 'arriving']
        
        if status not in valid_statuses:
            return False
        
        # Normalize addresses for robust matching (case-insensitive)
        source_norm = _normalize_location(source).lower()
        dest_norm = _normalize_location(destination).lower()
        origin_norm = _normalize_location(self.origin).lower()
        destination_norm = _normalize_location(self.destination).lower()
        
        source_matches = (
            bool(source_norm) and (origin_norm in source_norm or source_norm in origin_norm)
        )
        destination_matches = (
            bool(dest_norm) and (destination_norm in dest_norm or dest_norm in destination_norm)
        )
        
        # Normalize car type for comparison
        # Handle cases like "Mini Van" -> "mini van" or "minivan"
        expected_car_type = self.car_type.lower().replace(' ', '')
        actual_car_type = current_ride_option.lower().replace(' ', '')
        
        # Check if the car type matches
        car_type_matches = expected_car_type == actual_car_type
        
        return source_matches and destination_matches and car_type_matches

