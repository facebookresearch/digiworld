# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import sqlite3
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario


class OpenLastCompletedRideInfoScenario(RydeScenario, TargetStateScenario):
    """Scenario for viewing information about the last completed ride."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user has navigated to the RideDetails screen showing the last completed ride.
        
        This is verified by:
        1. Checking if the user is on the RideDetails screen
        2. Verifying that the ride being viewed is the most recent completed ride for the user
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing the last completed ride details, False otherwise.
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
        
        # Check if we're on the RideDetails screen
        screen_name = current_session.get('data', {}).get('screenName', '')
        route = current_session.get('data', {}).get('route', '')
        
        # The RideDetails screen has screenName="RideDetails" and route="/screens/rides/RideDetails"
        if screen_name != 'RideDetails' or route != '/screens/rides/RideDetails':
            return False
        
        # Get the rideId from the session data
        session_data = current_session.get('data', {}).get('sessionData', {})
        form_data = session_data.get('formData', {})
        current_ride_id = form_data.get('rideId') or form_data.get('ride_id')
        
        if not current_ride_id:
            return False
        
        # Convert current_ride_id to string for comparison (since rideHistory uses string IDs)
        current_ride_id_str = str(current_ride_id)
        
        # Get the current user ID
        user_id = self.current_user_id
        if not user_id:
            return False
        
        # First, try to get completed rides from rideHistory in rootstore
        ride_store = rootstore.get('rideStore', {})
        ride_history = ride_store.get('rideHistory', [])
        
        # Filter completed rides from history and find the most recent one
        completed_rides = [
            ride for ride in ride_history 
            if ride.get('status') == 'completed'
        ]
        
        if completed_rides:
            # Sort by endTime to find the most recent completed ride
            # endTime is stored as a timestamp in rideHistory
            sorted_rides = sorted(
                completed_rides,
                key=lambda r: r.get('endTime', 0),
                reverse=True
            )
            last_completed_ride_id = sorted_rides[0].get('id')
            
            # Check if the current ride being viewed is the last completed ride
            if current_ride_id_str == last_completed_ride_id:
                return True
        
        # If not found in rideHistory, try querying the database
        # The database is named after the session ID (basename of the state_path)
        session_id = os.path.basename(state_path)
        db_path = os.path.join(state_path, f"{session_id}.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Check if rides table exists
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rides'")
            table_exists = cursor.fetchone()
            
            if table_exists:
                # Get the most recent completed ride for the user
                # Order by end_time descending and then by id descending to get the latest
                cursor.execute("""
                    SELECT id FROM rides 
                    WHERE user_id = ? AND status = 'completed' 
                    ORDER BY end_time DESC, id DESC 
                    LIMIT 1
                """, (user_id,))
                
                result = cursor.fetchone()
                conn.close()
                
                if result:
                    last_completed_ride_id = result[0]
                    
                    # Try to convert current_ride_id to integer for database comparison
                    try:
                        current_ride_id_int = int(current_ride_id)
                        if current_ride_id_int == last_completed_ride_id:
                            return True
                    except (ValueError, TypeError):
                        pass
            else:
                conn.close()
        
        # If we couldn't find any completed rides, return False
        return False
