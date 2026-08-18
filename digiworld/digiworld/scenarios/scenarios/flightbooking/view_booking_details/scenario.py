# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
import json
import os
import logging

logger = logging.getLogger(__name__)


class ViewBookingDetailsScenario(FlightBookingScenario, TargetStateScenario):
    """Scenario for viewing details of a specific booking."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the user is viewing the correct booking details screen.
        
        Args:
            state_path: The path to the current state to verify.
            
        Returns:
            bool: True if viewing the correct booking's details, False otherwise.
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
        
        # Check if on booking details screen
        is_booking_details = (
            'booking details' in screen_name or 
            'booking-details' in route or
            ('/booking/' in route and 'details' in route)
        )
        
        if not is_booking_details:
            return False
        
        # Get expected booking reference from scenario parameters
        expected_ref = getattr(self, 'booking_reference', None)
        if not expected_ref:
            logger.warning("No booking_reference parameter found in scenario")
            return False
        
        expected_ref = expected_ref.upper()
        
        # Method 1: Check bookingDetailsStore for the loaded booking data
        booking_details_store = rootstore.get('bookingDetailsStore', {})
        booking_data = booking_details_store.get('bookingData')
        if booking_data:
            actual_ref = booking_data.get('booking_reference', '').upper()
            if actual_ref == expected_ref:
                return True
            # Also check reference field (some apps use different field names)
            actual_ref = booking_data.get('reference', '').upper()
            if actual_ref == expected_ref:
                return True
        
        # Method 2: Try to extract booking reference from the route
        try:
            route_parts = route.split('/')
            for i, part in enumerate(route_parts):
                if part in ('booking', 'bookings') and i + 1 < len(route_parts):
                    booking_id = route_parts[i + 1]
                    # Query database to get booking reference
                    query = "SELECT booking_reference FROM bookings WHERE booking_id = ? OR booking_reference = ?"
                    results = self._execute_query_in_path(query, (booking_id, booking_id), state_path)
                    if results:
                        db_ref = results[0][0].upper()
                        if db_ref == expected_ref:
                            return True
        except Exception as e:
            logger.debug(f"Error extracting booking from route: {e}")
        
        # Method 3: Check lastBookingId in bookingDetailsStore
        last_booking_id = booking_details_store.get('lastBookingId')
        if last_booking_id:
            try:
                query = "SELECT booking_reference FROM bookings WHERE booking_id = ? OR id = ?"
                results = self._execute_query_in_path(query, (last_booking_id, last_booking_id), state_path)
                if results:
                    db_ref = results[0][0].upper()
                    if db_ref == expected_ref:
                        return True
            except Exception as e:
                logger.debug(f"Error checking lastBookingId: {e}")
        
        logger.info(f"Booking verification failed: expected {expected_ref}, on screen {screen_name}")
        return False
