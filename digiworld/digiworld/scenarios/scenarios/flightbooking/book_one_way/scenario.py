# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for booking a one-way flight."""

import logging
from typing import Dict

from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class BookOneWayScenario(FlightBookingScenario, ComposableScenario):
    """Verify that the agent booked a one-way flight with the correct parameters."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        expected_pax = int(self.adults) + int(self.children)

        initial_ids = self._get_booking_ids(self.initial_state_path)
        final_ids = self._get_booking_ids(state_path)
        new_ids = final_ids - initial_ids

        if not new_ids:
            logger.info("No new bookings found")
            return {
                "new_booking_created": False,
                "correct_route": False,
                "correct_passenger_count": False,
            }

        for bid in new_ids:
            route_rows = self._execute_query_in_path(
                "SELECT origin, destination FROM booking_flights WHERE booking_id = ?",
                (bid,), state_path,
            )
            has_correct_route = any(
                r[0].upper() == self.origin.upper()
                and r[1].upper() == self.destination.upper()
                for r in route_rows
            )

            pax_rows = self._execute_query_in_path(
                "SELECT COUNT(*) FROM passengers WHERE booking_id = ?",
                (bid,), state_path,
            )
            pax_count = pax_rows[0][0] if pax_rows else 0

            if has_correct_route:
                return {
                    "new_booking_created": True,
                    "correct_route": True,
                    "correct_passenger_count": pax_count == expected_pax,
                }

        return {
            "new_booking_created": len(new_ids) > 0,
            "correct_route": False,
            "correct_passenger_count": False,
        }

    def _get_booking_ids(self, state_path: str) -> set:
        rows = self._execute_query_in_path(
            "SELECT booking_id FROM bookings WHERE user_id = ?",
            (self.current_user_id,), state_path,
        )
        return {r[0] for r in rows}
