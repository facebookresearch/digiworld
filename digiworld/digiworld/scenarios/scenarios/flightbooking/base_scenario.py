# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Base scenario class for flight booking app scenarios."""

import os
import sqlite3
import logging

from digiworld.scenarios.scenario_base import Scenario
from digiworld.scenarios.scenarios.flightbooking.template_resolver import FlightBookingTemplateResolver

logger = logging.getLogger(__name__)


class FlightBookingScenario(Scenario):
    """Base class for flight booking scenarios."""
    
    def _get_positioning_data(self, db_path):
        """
        Get flight booking-specific data for template resolution.
        """
        if not hasattr(self, 'current_user_id') or self.current_user_id is None:
            logger.debug("current_user_id not available yet, returning empty positioning data")
            return {'flight_count': 0, 'booking_count': 0, 'airport_count': 0}

        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM flights")
        flight_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM bookings WHERE user_id = ?", (self.current_user_id,))
        booking_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM airports")
        airport_count = cursor.fetchone()[0]

        conn.close()

        logger.info(f"Found {flight_count} flights, {booking_count} bookings, {airport_count} airports")
        return {
            'flight_count': flight_count,
            'booking_count': booking_count,
            'airport_count': airport_count
        }
    
    def _create_template_resolver(self, user_context, positioning_data):
        """
        Create FlightBookingTemplateResolver with positioning support.
        """
        return FlightBookingTemplateResolver(
            user_context=user_context,
            positioning_data=positioning_data,
            db_path=getattr(self, '_current_db_path', None)
        )

    def _get_supported_context_fields(self):
        """
        Flight booking scenarios support basic user context fields.
        """
        base_fields = Scenario._get_supported_context_fields(self)
        return base_fields
