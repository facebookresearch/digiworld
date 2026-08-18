# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: add a vehicle then pay for parking with it."""

import logging
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario

logger = logging.getLogger(__name__)


class AddVehicleAndPayScenario(ParkingScenario, ComposableScenario):
    """Verify that the agent added a vehicle and then paid for parking with it.

    Combines add_vehicle (vehicle exists with correct details)
    + pay_for_parking (parking session created for that vehicle at the zone).
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # Check 1: vehicle was created with the correct details
        vehicle_query = """
            SELECT v.make, v.model, v.color, v.nickname, vt.name
            FROM vehicles v
            JOIN vehicle_types vt ON v.vehicle_type_id = vt.id
            WHERE LOWER(v.plate_number) = LOWER(?) AND v.user_id = ?
        """
        vehicle_results = self._execute_query_in_path(
            vehicle_query, (self.license_plate, self.current_user_id), state_path
        )

        if not vehicle_results:
            return {
                "vehicle_created": False,
                "correct_make": False,
                "correct_model": False,
                "correct_color": False,
                "correct_nickname": False,
                "correct_vehicle_type": False,
                "session_created": False,
                "correct_duration": False,
            }

        db_make, db_model, db_color, db_nickname, db_type_name = vehicle_results[0]

        vehicle_created = True
        correct_make = (db_make or "").lower() == self.make.lower()
        correct_model = (db_model or "").lower() == self.model.lower()
        correct_color = (db_color or "").lower() == self.color.lower()
        correct_nickname = (db_nickname or "").lower() == self.nickname.lower()
        correct_vehicle_type = (db_type_name or "").lower() == self.vehicle_type.lower()

        # Check 2: parking session was created for this vehicle
        # Look up the vehicle id by nickname (the pay_for_parking step uses nickname)
        vid_query = "SELECT id FROM vehicles WHERE LOWER(nickname) = LOWER(?) AND user_id = ?"
        vid_results = self._execute_query_in_path(
            vid_query, (self.nickname, self.current_user_id), state_path
        )
        if not vid_results:
            return {
                "vehicle_created": vehicle_created,
                "correct_make": correct_make,
                "correct_model": correct_model,
                "correct_color": correct_color,
                "correct_nickname": correct_nickname,
                "correct_vehicle_type": correct_vehicle_type,
                "session_created": False,
                "correct_duration": False,
            }

        vehicle_id = vid_results[0][0]

        zone_query = "SELECT id FROM parking_zones WHERE LOWER(zone_code) = LOWER(?)"
        zone_results = self._execute_query_in_path(
            zone_query, (self.zone_code,), state_path
        )
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
            session_created = False
            correct_duration = False
        else:
            planned_duration = history_results[0][0]
            status = history_results[0][1]
            expected_minutes = int(self.minutes)
            session_created = status in ("active", "booked", "ongoing")
            correct_duration = planned_duration == expected_minutes

        logger.info(
            "Add vehicle + pay: vehicle_created=%s, session_created=%s, "
            "correct_duration=%s",
            vehicle_created, session_created, correct_duration,
        )

        return {
            "vehicle_created": vehicle_created,
            "correct_make": correct_make,
            "correct_model": correct_model,
            "correct_color": correct_color,
            "correct_nickname": correct_nickname,
            "correct_vehicle_type": correct_vehicle_type,
            "session_created": session_created,
            "correct_duration": correct_duration,
        }
