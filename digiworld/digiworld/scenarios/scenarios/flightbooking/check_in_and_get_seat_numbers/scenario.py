# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: check in to a flight and report the seat numbers."""

import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckInAndGetSeatNumbersScenario(FlightBookingScenario, ComposableScenario):
    """Verify that the agent checked into a flight and correctly reports
    the seat number(s) for that flight."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        origin = getattr(self, "origin", None)
        destination = getattr(self, "destination", None)
        if not origin or not destination:
            raise ValueError("origin and destination parameters are required")

        # --- Part 1: check-in verification (from check_in_flight) ---

        rows = self._execute_query_in_path(
            "SELECT b.booking_id, bf.flight_id FROM bookings b "
            "JOIN booking_flights bf ON b.booking_id = bf.booking_id "
            "WHERE b.user_id = ? AND bf.destination = ? AND b.status = 'confirmed' "
            "ORDER BY bf.departure_time ASC LIMIT 1",
            (self.current_user_id, destination),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(
                f"No confirmed booking to {destination} "
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
        checked_in = any(
            row[0] == "checked_in" for row in seat_rows
        )

        # --- Part 2: seat numbers answer check (from get_seat_numbers) ---

        seat_query = (
            "SELECT sa.seat_number "
            "FROM seat_assignments sa "
            "JOIN passengers p ON sa.passenger_id = p.passenger_id "
            "JOIN bookings b ON p.booking_id = b.booking_id "
            "JOIN booking_flights bf ON b.booking_id = bf.booking_id "
            "AND sa.flight_id = bf.flight_id "
            "WHERE b.user_id = ? AND bf.origin = ? AND bf.destination = ? "
            "AND b.status != 'cancelled'"
        )
        seat_result_rows = self._execute_query_in_path(
            seat_query,
            (self.current_user_id, origin, destination),
            state_path,
        )

        if not seat_result_rows:
            # Fallback: try initial state (seats are assigned before check-in)
            seat_result_rows = self._execute_query_in_path(
                seat_query,
                (self.current_user_id, origin, destination),
                self.initial_state_path,
            )

        if not seat_result_rows:
            raise ValueError(
                f"No seat assignments for flight from '{origin}' to "
                f"'{destination}' found for user {self.current_user_id}"
            )

        seat_list = [row[0] for row in seat_result_rows]
        answer_matches = all_substrings_match(self.agent_answer, seat_list)

        logger.info(
            "Check-in and get seat numbers check: "
            "checked_in=%s, seats=%s, "
            "agent_answer=%r, answer_matches=%s",
            checked_in, seat_list,
            self.agent_answer, answer_matches,
        )

        return {
            "checked_in": checked_in,
            "answer_matches": answer_matches,
        }
