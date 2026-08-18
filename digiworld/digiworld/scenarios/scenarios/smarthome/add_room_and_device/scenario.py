# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: add a new room, then add a device to it."""

import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddRoomAndDeviceScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a room was created and a device was added to it."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Room checks (from add_new_room) ---
        room_query = """
            SELECT name, description, type, floor, id
            FROM rooms
            WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL
        """
        room_results = self._execute_query_in_path(
            room_query, (self.room_name, self.current_user_id), state_path
        )

        if not room_results:
            return {
                "room_created": False,
                "correct_description": False,
                "correct_type": False,
                "correct_floor": False,
                "device_exists": False,
                "correct_device_type": False,
                "correct_room": False,
            }

        row = room_results[0]
        db_name, db_description, db_type, db_floor, room_id = row

        room_created = True
        correct_description = (db_description or "").lower() == self.description.lower()
        correct_type = (db_type or "").lower() == self.room_type.lower()
        correct_floor = int(db_floor) == int(self.floor)

        # --- Device checks (from add_device_to_room) ---
        device_query = (
            "SELECT id, device_type_id, room_id FROM devices "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? "
            "AND deleted_at IS NULL"
        )
        device_rows = self._execute_query_in_path(
            device_query, (self.device_name, self.current_user_id), state_path
        )

        if not device_rows:
            logger.info(f"Device '{self.device_name}': not found")
            return {
                "room_created": room_created,
                "correct_description": correct_description,
                "correct_type": correct_type,
                "correct_floor": correct_floor,
                "device_exists": False,
                "correct_device_type": False,
                "correct_room": False,
            }

        device_id, device_type_id, device_room_id = device_rows[0]

        # Check device type
        type_query = (
            "SELECT id FROM device_types "
            "WHERE LOWER(name) = LOWER(?) AND is_active = 1"
        )
        type_rows = self._execute_query_in_path(
            type_query, (self.device_type,), state_path
        )
        if not type_rows:
            raise ValueError(f"Device type {self.device_type!r} not found")
        expected_type_id = int(type_rows[0][0])

        type_ok = device_type_id == expected_type_id

        # Check that the device is in the newly created room
        room_name_query = "SELECT name FROM rooms WHERE id = ? AND deleted_at IS NULL"
        room_name_rows = self._execute_query_in_path(
            room_name_query, (device_room_id,), state_path
        )
        room_ok = False
        if room_name_rows:
            room_ok = room_name_rows[0][0].strip().lower() == self.room_name.strip().lower()

        logger.info(
            f"Device '{self.device_name}': exists=True, "
            f"type_ok={type_ok} (got={device_type_id}, want={expected_type_id}), "
            f"room_ok={room_ok}"
        )

        return {
            "room_created": room_created,
            "correct_description": correct_description,
            "correct_type": correct_type,
            "correct_floor": correct_floor,
            "device_exists": True,
            "correct_device_type": type_ok,
            "correct_room": room_ok,
        }
