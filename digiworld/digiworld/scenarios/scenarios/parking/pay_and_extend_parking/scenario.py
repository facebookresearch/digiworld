"""Composed scenario: pay for parking then extend the session."""

import logging
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario

logger = logging.getLogger(__name__)


class PayAndExtendParkingScenario(ParkingScenario, ComposableScenario):
    """Verify that the agent paid for parking and then extended it.

    Combines pay_for_parking (session created with correct initial duration)
    + extend_parking_session (total duration = pay_minutes + extend_minutes,
    session still active).
    """

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

        # There should be no session in the initial state for this vehicle/zone
        initial_query = """
            SELECT planned_duration_minutes
            FROM parking_history
            WHERE user_id = ? AND vehicle_id = ? AND parking_zone_id = ?
            ORDER BY id DESC LIMIT 1
        """
        initial_results = self._execute_query_in_path(
            initial_query, (self.current_user_id, vehicle_id, zone_id),
            self.initial_state_path
        )

        # Check final state
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
            return {
                "session_created": False,
                "correct_initial_duration": False,
                "duration_extended": False,
                "session_still_active": False,
            }

        expected_pay = int(self.pay_minutes)
        expected_extend = int(self.extend_minutes)
        expected_total = expected_pay + expected_extend

        latest_duration = final_results[0][0]
        latest_status = final_results[0][1]
        total_duration = sum(r[0] for r in final_results if r[0])

        # Session was created (at least one history record exists)
        session_created = len(final_results) > 0

        # Check that the initial pay duration was correct:
        # If app updated existing row, latest_duration should be total.
        # If app created new rows, one should have pay_minutes.
        any_has_pay_duration = any(
            r[0] == expected_pay for r in final_results
        )
        correct_initial_duration = (
            any_has_pay_duration
            or latest_duration == expected_total
        )

        # Duration extended: total should match pay + extend
        duration_ok = (
            latest_duration >= expected_total
            or total_duration >= expected_total
        )

        return {
            "session_created": session_created,
            "correct_initial_duration": correct_initial_duration,
            "duration_extended": duration_ok,
            "session_still_active": latest_status in ("active", "booked", "ongoing"),
        }
