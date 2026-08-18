# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import logging

from digiworld.scenarios.answer_matchers import time_match
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

LOCAL_TZ = datetime.datetime.now(datetime.timezone.utc).astimezone().tzinfo


class GetFlightTimeScenario(FlightBookingScenario, ComposableScenario):
    """Verify that the agent correctly reports the departure time of a flight."""

    def _get_checks(self, state_path):
        origin = getattr(self, "origin", None)
        destination = getattr(self, "destination", None)
        if not origin or not destination:
            raise ValueError("origin and destination parameters are required")

        query = (
            "SELECT bf.departure_time "
            "FROM booking_flights bf "
            "JOIN bookings b ON bf.booking_id = b.booking_id "
            "WHERE b.user_id = ? AND bf.origin = ? AND bf.destination = ? "
            "AND b.status != 'cancelled' "
            "ORDER BY bf.departure_time DESC LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, origin, destination),
            self.initial_state_path,
        )

        if not rows:
            raise ValueError(
                f"No active flight from '{origin}' to '{destination}' found "
                f"for user {self.current_user_id}"
            )

        raw_ts = rows[0][0].replace("Z", "+00:00")
        utc_dt = datetime.datetime.fromisoformat(raw_ts)
        expected_time = utc_dt.astimezone(LOCAL_TZ).time()
        logger.info(
            f"Expected flight time ({LOCAL_TZ}): {expected_time}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": time_match(
                self.agent_answer, expected_time, tolerance_minutes=1
            )
        }
