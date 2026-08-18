# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for booking a round trip flight."""

import logging
from typing import Dict

from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class BookRoundTripScenario(FlightBookingScenario, ComposableScenario):
    """Verify that the agent booked a round trip flight with the correct parameters."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        expected_pax = int(self.adults) + int(self.children)

        initial_ids = self._get_booking_ids(self.initial_state_path)
        final_ids = self._get_booking_ids(state_path)
        new_ids = final_ids - initial_ids

        if not new_ids:
            logger.info("No new bookings found")
            return {
                "new_booking_created": False,
                "correct_trip_type": False,
                "correct_route": False,
                "correct_passenger_count": False,
            }

        for bid in new_ids:
            booking_rows = self._execute_query_in_path(
                "SELECT trip_type FROM bookings WHERE booking_id = ?",
                (bid,), state_path,
            )
            if not booking_rows:
                continue

            is_round_trip = booking_rows[0][0] == "round_trip"

            route_rows = self._execute_query_in_path(
                "SELECT origin, destination, segment FROM booking_flights WHERE booking_id = ?",
                (bid,), state_path,
            )
            has_outbound = any(
                r[0].upper() == self.origin.upper()
                and r[1].upper() == self.destination.upper()
                and r[2] == "outbound"
                for r in route_rows
            )
            has_return = any(
                r[0].upper() == self.destination.upper()
                and r[1].upper() == self.origin.upper()
                and r[2] == "return"
                for r in route_rows
            )

            pax_rows = self._execute_query_in_path(
                "SELECT COUNT(*) FROM passengers WHERE booking_id = ?",
                (bid,), state_path,
            )
            pax_count = pax_rows[0][0] if pax_rows else 0

            if is_round_trip and has_outbound and has_return:
                return {
                    "new_booking_created": True,
                    "correct_trip_type": True,
                    "correct_route": True,
                    "correct_passenger_count": pax_count == expected_pax,
                }

        return {
            "new_booking_created": len(new_ids) > 0,
            "correct_trip_type": False,
            "correct_route": False,
            "correct_passenger_count": False,
        }

    def _get_booking_ids(self, state_path: str) -> set:
        rows = self._execute_query_in_path(
            "SELECT booking_id FROM bookings WHERE user_id = ?",
            (self.current_user_id,), state_path,
        )
        return {r[0] for r in rows}
