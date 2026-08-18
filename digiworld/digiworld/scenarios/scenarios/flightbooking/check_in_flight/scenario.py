# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckInFlightScenario(FlightBookingScenario, ComposableScenario):

    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            "SELECT b.booking_id, bf.flight_id FROM bookings b "
            "JOIN booking_flights bf ON b.booking_id = bf.booking_id "
            "WHERE b.user_id = ? AND bf.destination = ? AND b.status = 'confirmed' "
            "ORDER BY bf.departure_time ASC LIMIT 1",
            (self.current_user_id, self.destination),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(
                f"No confirmed booking to {self.destination} "
                f"found for user {self.current_user_id}"
            )
        booking_id, flight_id = rows[0]

        seat_rows = self._execute_query_in_path(
            "SELECT sa.check_in_status FROM seat_assignments sa "
            "JOIN passengers p ON sa.passenger_id = p.passenger_id "
            "WHERE p.booking_id = ? AND sa.flight_id = ?",
            (booking_id, flight_id),
            state_path,
        )
        any_checked_in = any(
            row[0] == "checked_in" for row in seat_rows
        )

        return {"checked_in": any_checked_in}
