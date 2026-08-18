"""Composed scenario: add a device to a room, then query info about it."""

import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddDeviceAndQueryInfoScenario(SmartHomeScenario, ComposableScenario):
    """Verify a device was added and the agent correctly reports its info."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
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
                "device_exists": False,
                "correct_device_type": False,
                "correct_room": False,
                "answer_correct": False,
            }

        device_id, device_type_id, room_id = device_rows[0]

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

        # Check room assignment
        room_query = "SELECT name FROM rooms WHERE id = ? AND deleted_at IS NULL"
        room_rows = self._execute_query_in_path(room_query, (room_id,), state_path)
        room_ok = False
        if room_rows:
            room_ok = room_rows[0][0].strip().lower() == self.room_name.strip().lower()

        logger.info(
            f"Device '{self.device_name}': exists=True, "
            f"type_ok={type_ok}, room_ok={room_ok}"
        )

        # --- Info query check (from device_info_query, adapted for 'room') ---
        info_type = getattr(self, "info_type", "room")

        if info_type.lower() == "room":
            # The answer should be the room name
            answer_ok = substring_match(self.agent_answer, self.room_name)
        else:
            # Fallback: unsupported info_type
            raise ValueError(
                f"Unknown info_type {info_type!r} for composed scenario. "
                f"Supported: room"
            )

        logger.info(
            f"Info query '{info_type}': expected='{self.room_name}', "
            f"agent answer: {self.agent_answer!r}, match={answer_ok}"
        )

        return {
            "device_exists": True,
            "correct_device_type": type_ok,
            "correct_room": room_ok,
            "answer_correct": answer_ok,
        }
