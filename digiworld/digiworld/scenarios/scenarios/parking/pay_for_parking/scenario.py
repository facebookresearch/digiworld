# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for paying for a parking spot."""

import logging
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario

logger = logging.getLogger(__name__)


class PayForParkingScenario(ParkingScenario, ComposableScenario):
    """Verify that the agent booked a parking session for the correct vehicle, zone, and duration."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        vehicle_query = "SELECT id FROM vehicles WHERE LOWER(nickname) = LOWER(?) AND user_id = ?"
        vehicle_results = self._execute_query_in_path(
            vehicle_query, (self.vehicle, self.current_user_id), state_path
        )
        if not vehicle_results:
            raise ValueError(f"Vehicle '{self.vehicle}' not found for user {self.current_user_id}")
        vehicle_id = vehicle_results[0][0]

        zone_query = "SELECT id FROM parking_zones WHERE LOWER(zone_code) = LOWER(?)"
        zone_results = self._execute_query_in_path(zone_query, (self.zone_code,), state_path)
        if not zone_results:
            raise ValueError(f"Parking zone '{self.zone_code}' not found")
        zone_id = zone_results[0][0]

        history_query = """
            SELECT planned_duration_minutes, status
            FROM parking_history
            WHERE user_id = ? AND vehicle_id = ? AND parking_zone_id = ?
            ORDER BY id DESC LIMIT 1
        """
        history_results = self._execute_query_in_path(
            history_query, (self.current_user_id, vehicle_id, zone_id), state_path
        )

        if not history_results:
            return {
                "session_created": False,
                "correct_duration": False,
            }

        planned_duration = history_results[0][0]
        status = history_results[0][1]
        expected_minutes = int(self.minutes)

        return {
            "session_created": status in ("active", "booked", "ongoing"),
            "correct_duration": planned_duration == expected_minutes,
        }
