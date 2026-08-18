import logging
from typing import Dict

from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class BookAndCancelFlightScenario(FlightBookingScenario, ComposableScenario):
    """Verify that a flight was booked and then cancelled."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Part 1: booking was created check (from book_one_way) ---
        # Use compare_database_records to confirm a new booking appeared

        initial_ids = self._get_booking_ids(self.initial_state_path)
        final_ids = self._get_booking_ids(state_path)
        new_ids = final_ids - initial_ids

        booking_was_created = len(new_ids) > 0

        # Find the new booking that matches the route
        target_booking_id = None
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
            if has_correct_route:
                target_booking_id = bid
                break

        # --- Part 2: booking cancelled check (from cancel_flight) ---

        booking_cancelled = False
        flight_cancelled = False

        if target_booking_id:
            booking_rows = self._execute_query_in_path(
                "SELECT status FROM bookings WHERE booking_id = ?",
                (target_booking_id,),
                state_path,
            )
            booking_cancelled = bool(
                booking_rows and booking_rows[0][0] == "cancelled"
            )

            flight_rows = self._execute_query_in_path(
                "SELECT status FROM booking_flights "
                "WHERE booking_id = ? AND destination = ?",
                (target_booking_id, self.destination),
                state_path,
            )
            flight_cancelled = bool(
                flight_rows and flight_rows[0][0] == "cancelled"
            )
        else:
            # If we cannot find a new booking with the right route in the
            # final state, the booking might have been created and then
            # hard-deleted. Check if any booking to destination is cancelled.
            rows = self._execute_query_in_path(
                "SELECT b.booking_id, b.status FROM bookings b "
                "JOIN booking_flights bf ON b.booking_id = bf.booking_id "
                "WHERE b.user_id = ? AND bf.destination = ? "
                "ORDER BY b.created_at DESC LIMIT 1",
                (self.current_user_id, self.destination),
                state_path,
            )
            if rows and rows[0][1] == "cancelled":
                booking_cancelled = True
                bid = rows[0][0]
                flight_rows = self._execute_query_in_path(
                    "SELECT status FROM booking_flights "
                    "WHERE booking_id = ? AND destination = ?",
                    (bid, self.destination),
                    state_path,
                )
                flight_cancelled = bool(
                    flight_rows and flight_rows[0][0] == "cancelled"
                )

        logger.info(
            f"Book and cancel flight check: "
            f"booking_was_created={booking_was_created}, "
            f"booking_cancelled={booking_cancelled}, "
            f"flight_cancelled={flight_cancelled}, "
            f"new_booking_ids={new_ids}"
        )

        return {
            "booking_was_created": booking_was_created,
            "booking_cancelled": booking_cancelled,
            "flight_cancelled": flight_cancelled,
        }

    def _get_booking_ids(self, state_path: str) -> set:
        rows = self._execute_query_in_path(
            "SELECT booking_id FROM bookings WHERE user_id = ?",
            (self.current_user_id,), state_path,
        )
        return {r[0] for r in rows}
