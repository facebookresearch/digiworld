# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetSeatNumbersScenario(FlightBookingScenario, ComposableScenario):
    """Verify that the agent correctly reports all seat numbers for a flight."""

    def _get_checks(self, state_path):
        origin = getattr(self, "origin", None)
        destination = getattr(self, "destination", None)
        if not origin or not destination:
            raise ValueError("origin and destination parameters are required")

        query = (
            "SELECT sa.seat_number "
            "FROM seat_assignments sa "
            "JOIN passengers p ON sa.passenger_id = p.passenger_id "
            "JOIN bookings b ON p.booking_id = b.booking_id "
            "JOIN booking_flights bf ON b.booking_id = bf.booking_id "
            "AND sa.flight_id = bf.flight_id "
            "WHERE b.user_id = ? AND bf.origin = ? AND bf.destination = ? "
            "AND b.status != 'cancelled'"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, origin, destination),
            self.initial_state_path,
        )

        if not rows:
            raise ValueError(
                f"No seat assignments for flight from '{origin}' to "
                f"'{destination}' found for user {self.current_user_id}"
            )

        seat_list = [row[0] for row in rows]
        logger.info(
            f"Expected seat numbers: {seat_list}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": all_substrings_match(self.agent_answer, seat_list)}
