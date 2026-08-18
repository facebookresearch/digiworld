# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for retrieving comprehensive flight details."""

import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import (
    all_substrings_match,
    substring_match,
)
from digiworld.scenarios.scenarios.flightbooking.base_scenario import FlightBookingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetFlightDetailsScenario(FlightBookingScenario, ComposableScenario):
    """Verify the agent correctly reports flight details."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
        SELECT bf.flight_number, bf.airline_code, bf.departure_time, bf.arrival_time
        FROM booking_flights bf
        JOIN bookings b ON bf.booking_id = b.booking_id
        WHERE b.user_id = ?
          AND bf.origin = ?
          AND bf.destination = ?
          AND bf.departure_time LIKE ?
          AND b.status != 'cancelled'
        ORDER BY bf.departure_time DESC
        LIMIT 1
        """
        date_prefix = self.date + "%"
        rows = self._execute_query_in_path(
            query,
            (self.current_user_id, self.origin, self.destination, date_prefix),
            self.initial_state_path,
        )
        if not rows:
            raise ValueError(
                f"No flight found from {self.origin} to {self.destination} on {self.date}"
            )

        flight_number = rows[0][0]

        return {
            "has_flight_number": substring_match(self.agent_answer, flight_number),
            "has_route_info": all_substrings_match(
                self.agent_answer, [self.origin, self.destination]
            ),
        }
