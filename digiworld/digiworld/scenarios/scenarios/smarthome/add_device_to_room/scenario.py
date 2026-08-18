# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddDeviceToRoomScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a new device was added to the correct room with the
    expected type."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        device_row = self._find_device(state_path)
        if device_row is None:
            logger.info(f"Device '{self.device_name}': not found")
            return {
                "device_exists": False,
                "correct_device_type": False,
                "correct_room": False,
            }

        device_id, device_type_id, room_id = device_row

        expected_type_id = self._get_expected_device_type_id(state_path)
        type_ok = device_type_id == expected_type_id
        room_ok = self._check_room(state_path, room_id)

        logger.info(
            f"Device '{self.device_name}': exists=True, "
            f"type_ok={type_ok} (got={device_type_id}, want={expected_type_id}), "
            f"room_ok={room_ok}"
        )
        return {
            "device_exists": True,
            "correct_device_type": type_ok,
            "correct_room": room_ok,
        }

    def _find_device(self, state_path: str):
        query = (
            "SELECT id, device_type_id, room_id FROM devices "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? "
            "AND deleted_at IS NULL"
        )
        rows = self._execute_query_in_path(
            query, (self.device_name, self.current_user_id), state_path
        )
        if not rows:
            return None
        return rows[0]

    def _check_room(self, state_path: str, room_id: int) -> bool:
        query = "SELECT name FROM rooms WHERE id = ? AND deleted_at IS NULL"
        rows = self._execute_query_in_path(query, (room_id,), state_path)
        if not rows:
            return False
        return rows[0][0].strip().lower() == self.room_name.strip().lower()

    def _get_expected_device_type_id(self, state_path: str) -> int:
        query = (
            "SELECT id FROM device_types "
            "WHERE LOWER(name) = LOWER(?) AND is_active = 1"
        )
        rows = self._execute_query_in_path(query, (self.device_type,), state_path)
        if not rows:
            raise ValueError(f"Device type {self.device_type!r} not found")
        return int(rows[0][0])
