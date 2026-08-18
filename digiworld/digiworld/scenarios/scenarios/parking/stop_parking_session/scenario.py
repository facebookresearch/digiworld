# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for stopping an active parking session."""

import logging
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario

logger = logging.getLogger(__name__)


class StopParkingSessionScenario(ParkingScenario, ComposableScenario):
    """Verify that the agent stopped the parking session (status=completed, end time set)."""

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
            SELECT status, actual_end_time
            FROM parking_history
            WHERE user_id = ? AND vehicle_id = ? AND parking_zone_id = ?
            ORDER BY id DESC LIMIT 1
        """
        history_results = self._execute_query_in_path(
            history_query, (self.current_user_id, vehicle_id, zone_id), state_path
        )
        if not history_results:
            raise ValueError(
                f"No parking history found for vehicle '{self.vehicle}' at zone '{self.zone_code}'"
            )

        status = history_results[0][0]
        actual_end_time = history_results[0][1]

        return {
            "session_completed": status == "completed",
            "end_time_recorded": actual_end_time is not None,
        }
