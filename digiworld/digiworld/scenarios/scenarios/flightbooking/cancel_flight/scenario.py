# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CancelFlightScenario(FlightBookingScenario, ComposableScenario):

    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            "SELECT b.booking_id FROM bookings b "
            "JOIN booking_flights bf ON b.booking_id = bf.booking_id "
            "WHERE b.user_id = ? AND bf.destination = ? AND b.status = 'confirmed' "
            "ORDER BY b.created_at DESC LIMIT 1",
            (self.current_user_id, self.destination),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(
                f"No confirmed booking to {self.destination} "
                f"found for user {self.current_user_id}"
            )
        booking_id = rows[0][0]

        booking_rows = self._execute_query_in_path(
            "SELECT status FROM bookings WHERE booking_id = ?",
            (booking_id,),
            state_path,
        )
        booking_cancelled = bool(
            booking_rows and booking_rows[0][0] == "cancelled"
        )

        flight_rows = self._execute_query_in_path(
            "SELECT status FROM booking_flights "
            "WHERE booking_id = ? AND destination = ?",
            (booking_id, self.destination),
            state_path,
        )
        flight_cancelled = bool(
            flight_rows and flight_rows[0][0] == "cancelled"
        )

        return {
            "booking_cancelled": booking_cancelled,
            "flight_cancelled": flight_cancelled,
        }
