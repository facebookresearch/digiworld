# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetFlightStatusScenario(FlightBookingScenario, ComposableScenario):
    """Verify that the agent correctly reports the status of a flight."""

    def _get_checks(self, state_path):
        destination = getattr(self, "destination", None)
        if not destination:
            raise ValueError("destination parameter is required")

        query = (
            "SELECT bf.status "
            "FROM booking_flights bf "
            "JOIN bookings b ON bf.booking_id = b.booking_id "
            "WHERE b.user_id = ? AND bf.destination = ? AND b.status != 'cancelled' "
            "ORDER BY bf.departure_time DESC LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, destination), self.initial_state_path
        )

        if not rows:
            raise ValueError(
                f"No active flight to '{destination}' found "
                f"for user {self.current_user_id}"
            )

        db_status = rows[0][0] or ""

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
        matched = any(alias in answer_lower for alias in acceptable)

        logger.info(
            "DB status=%r, acceptable=%s, agent answer=%r, matched=%s",
            db_status, acceptable, self.agent_answer, matched,
        )
        return {"answer_matches": matched}
