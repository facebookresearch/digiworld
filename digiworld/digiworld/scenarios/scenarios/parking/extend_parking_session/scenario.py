# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Scenario for extending an active parking session."""

import logging
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario

logger = logging.getLogger(__name__)


class ExtendParkingSessionScenario(ParkingScenario, ComposableScenario):
    """Verify that the agent extended the parking session duration and kept it active."""

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

        initial_query = """
            SELECT planned_duration_minutes
            FROM parking_history
            WHERE user_id = ? AND vehicle_id = ? AND parking_zone_id = ?
            ORDER BY id DESC LIMIT 1
        """
        initial_results = self._execute_query_in_path(
            initial_query, (self.current_user_id, vehicle_id, zone_id), self.initial_state_path
        )
        if not initial_results:
            raise ValueError(
                f"No initial parking history found for vehicle '{self.vehicle}' "
                f"at zone '{self.zone_code}'"
            )
        initial_duration = initial_results[0][0]

        # The app may either update the existing row or create a new one.
        # Sum all active durations for this vehicle/zone to handle both cases.
        final_query = """
            SELECT planned_duration_minutes, status
            FROM parking_history
            WHERE user_id = ? AND vehicle_id = ? AND parking_zone_id = ?
            ORDER BY id DESC
        """
        final_results = self._execute_query_in_path(
            final_query, (self.current_user_id, vehicle_id, zone_id), state_path
        )
        if not final_results:
            raise ValueError(
                f"No final parking history found for vehicle '{self.vehicle}' "
                f"at zone '{self.zone_code}'"
            )

        latest_duration = final_results[0][0]
        latest_status = final_results[0][1]
        total_duration = sum(r[0] for r in final_results if r[0])
        expected_duration = initial_duration + int(self.minutes)

        duration_ok = (
            latest_duration >= expected_duration
            or total_duration >= expected_duration
        )

        return {
            "duration_extended": duration_ok,
            "session_still_active": latest_status in ("active", "booked", "ongoing"),
        }
