import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class BookAndGetFlightNumberScenario(FlightBookingScenario, ComposableScenario):
    """Verify that a flight was booked and the agent correctly reports
    the flight number of the newly booked flight."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        expected_pax = int(self.adults) + int(self.children)

        # --- Part 1: booking creation checks (from book_one_way) ---

        initial_ids = self._get_booking_ids(self.initial_state_path)
        final_ids = self._get_booking_ids(state_path)
        new_ids = final_ids - initial_ids

        new_booking_created = False
        correct_route = False
        correct_passenger_count = False
        flight_number = None

        for bid in new_ids:
            route_rows = self._execute_query_in_path(
                "SELECT origin, destination, flight_number FROM booking_flights "
                "WHERE booking_id = ?",
                (bid,), state_path,
            )
            has_correct_route = any(
                r[0].upper() == self.origin.upper()
                and r[1].upper() == self.destination.upper()
                for r in route_rows
            )

            if has_correct_route:
                pax_rows = self._execute_query_in_path(
                    "SELECT COUNT(*) FROM passengers WHERE booking_id = ?",
                    (bid,), state_path,
                )
                pax_count = pax_rows[0][0] if pax_rows else 0

                new_booking_created = True
                correct_route = True
                correct_passenger_count = pax_count == expected_pax

                # Get the flight number for the matching route
                for r in route_rows:
                    if (r[0].upper() == self.origin.upper()
                            and r[1].upper() == self.destination.upper()):
                        flight_number = r[2]
                        break
                break

        # --- Part 2: flight number answer check (from get_flight_number) ---
        # Query the final state for the flight number of the just-booked flight

        if not flight_number:
            # Fallback: query final state directly
            query = (
                "SELECT bf.flight_number "
                "FROM booking_flights bf "
                "JOIN bookings b ON bf.booking_id = b.booking_id "
                "WHERE b.user_id = ? AND bf.origin = ? AND bf.destination = ? "
                "AND b.status != 'cancelled' "
                "ORDER BY bf.departure_time DESC LIMIT 1"
            )
            rows = self._execute_query_in_path(
                query, (self.current_user_id, self.origin, self.destination),
                state_path,
            )
            if rows:
                flight_number = rows[0][0]

        if flight_number:
            answer_matches = substring_match(self.agent_answer, flight_number)
        else:
            answer_matches = False

        logger.info(
            f"Book and get flight number check: "
            f"new_booking={new_booking_created}, correct_route={correct_route}, "
            f"correct_pax={correct_passenger_count}, "
            f"flight_number={flight_number!r}, "
            f"agent_answer={self.agent_answer!r}, "
            f"answer_matches={answer_matches}"
        )

        return {
            "new_booking_created": new_booking_created,
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
