"""Composed scenario: book a round trip flight and report the departure date."""

import datetime
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import date_match
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class BookRoundTripAndGetDateScenario(FlightBookingScenario, ComposableScenario):
    """Verify that a round trip flight was booked and the agent correctly
    reports the departure date of the outbound flight."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        expected_pax = int(self.adults) + int(self.children)

        # --- Part 1: booking creation checks (from book_round_trip) ---

        initial_ids = self._get_booking_ids(self.initial_state_path)
        final_ids = self._get_booking_ids(state_path)
        new_ids = final_ids - initial_ids

        new_booking_created = False
        correct_trip_type = False
        correct_route = False
        correct_passenger_count = False
        departure_time_raw = None

        for bid in new_ids:
            booking_rows = self._execute_query_in_path(
                "SELECT trip_type FROM bookings WHERE booking_id = ?",
                (bid,), state_path,
            )
            if not booking_rows:
                continue

            is_round_trip = booking_rows[0][0] == "round_trip"

            route_rows = self._execute_query_in_path(
                "SELECT origin, destination, segment, departure_time "
                "FROM booking_flights WHERE booking_id = ?",
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
                new_booking_created = True
                correct_trip_type = True
                correct_route = True
                correct_passenger_count = pax_count == expected_pax

                # Get the outbound departure time for date check
                for r in route_rows:
                    if (r[0].upper() == self.origin.upper()
                            and r[1].upper() == self.destination.upper()
                            and r[2] == "outbound"):
                        departure_time_raw = r[3]
                        break
                break

        # --- Part 2: flight date answer check (from get_flight_date) ---

        if not departure_time_raw:
            # Fallback: query final state directly
            query = (
                "SELECT bf.departure_time "
                "FROM booking_flights bf "
                "JOIN bookings b ON bf.booking_id = b.booking_id "
                "WHERE b.user_id = ? AND bf.origin = ? AND bf.destination = ? "
                "AND b.status != 'cancelled' "
                "ORDER BY bf.departure_time DESC LIMIT 1"
            )
            rows = self._execute_query_in_path(
                query,
                (self.current_user_id, self.origin, self.destination),
                state_path,
            )
            if rows:
                departure_time_raw = rows[0][0]

        if departure_time_raw:
            raw_ts = departure_time_raw.replace("Z", "+00:00")
            expected_date = datetime.datetime.fromisoformat(raw_ts).date()
            answer_matches = date_match(self.agent_answer, expected_date)
        else:
            expected_date = None
            answer_matches = False

        logger.info(
            "Book round trip and get date check: "
            "new_booking=%s, correct_trip=%s, correct_route=%s, "
            "correct_pax=%s, expected_date=%s, "
            "agent_answer=%r, answer_matches=%s",
            new_booking_created, correct_trip_type, correct_route,
            correct_passenger_count, expected_date,
            self.agent_answer, answer_matches,
        )

        return {
            "new_booking_created": new_booking_created,
            "correct_trip_type": correct_trip_type,
            "correct_route": correct_route,
            "correct_passenger_count": correct_passenger_count,
            "answer_matches": answer_matches,
        }

    def _get_booking_ids(self, state_path: str) -> set:
        rows = self._execute_query_in_path(
            "SELECT booking_id FROM bookings WHERE user_id = ?",
            (self.current_user_id,), state_path,
        )
        return {r[0] for r in rows}
