# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario, _normalize_location


class BookRideScenario(RydeScenario, TargetStateScenario):
    """Scenario for booking a ride from one location to another."""
    
    def _check_task_completion(self, state_path):
        """
        Check if a ride has been booked from origin to destination.
        
        Since rides are only persisted to the database after driver assignment,
        we check the UI state (rootstore.json) to see if a currentRide exists
        with the matching source and destination.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if a ride with matching locations is booked, False otherwise.
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
        
        # Check if the ride status indicates it's been booked
        # Valid statuses: 'booked', 'driver-assigned', 'started', 'ongoing'
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
        
        return source_matches and destination_matches

