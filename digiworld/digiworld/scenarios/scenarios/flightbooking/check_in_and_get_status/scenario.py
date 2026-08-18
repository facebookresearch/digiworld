# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckInAndGetStatusScenario(FlightBookingScenario, ComposableScenario):
    """Verify that the agent checked into a flight and correctly reports
    its status from the final state."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        destination = getattr(self, "destination", None)
        if not destination:
            raise ValueError("destination parameter is required")

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

        # --- Part 2: flight status answer check (from get_flight_status) ---
        # Query the final state for the flight status

        status_query = (
            "SELECT bf.status "
            "FROM booking_flights bf "
            "JOIN bookings b ON bf.booking_id = b.booking_id "
            "WHERE b.user_id = ? AND bf.destination = ? AND b.status != 'cancelled' "
            "ORDER BY bf.departure_time DESC LIMIT 1"
        )
        status_rows = self._execute_query_in_path(
            status_query, (self.current_user_id, destination), state_path
        )

        if not status_rows:
            raise ValueError(
                f"No active flight to '{destination}' found "
                f"for user {self.current_user_id} in final state"
            )

        db_status = status_rows[0][0] or ""

        # The DB stores booking-level status (e.g. "confirmed") but the
        # app UI may display a user-friendly variant.
        status_aliases = {
            "confirmed": ["confirmed", "on time", "scheduled", "active"],
            "cancelled": ["cancelled", "canceled"],
            "completed": ["completed", "landed", "arrived"],
            "delayed": ["delayed"],
            "boarding": ["boarding"],
        }
        acceptable = status_aliases.get(db_status.lower(), [db_status.lower()])

        answer_lower = self.agent_answer.lower()
        answer_matches = any(alias in answer_lower for alias in acceptable)

        logger.info(
            "Check-in and get status check: checked_in=%s, "
            "db_status=%r, acceptable=%s, agent_answer=%r, answer_matches=%s",
            checked_in, db_status, acceptable, self.agent_answer, answer_matches,
        )

        return {
            "checked_in": checked_in,
            "answer_matches": answer_matches,
        }
