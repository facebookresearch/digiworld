# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class TurnOffAllInRoomScenario(SmartHomeScenario, ComposableScenario):
    """Verify that all devices in the target room are off, and all
    automations and scenes for the user are deactivated."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        room_name = getattr(self, "room_name", None)
        if not room_name:
            raise ValueError("room_name parameter is required")

        devices_on = self._execute_query_in_path(
            "SELECT COUNT(*) FROM devices d "
            "JOIN rooms r ON d.room_id = r.id "
            "WHERE LOWER(r.name) = LOWER(?) AND r.user_id = ? "
            "AND d.is_on = 1 AND d.deleted_at IS NULL",
            (room_name, self.current_user_id),
            state_path,
        )
        devices_on_count = devices_on[0][0] if devices_on else 0

        active_automations = self._execute_query_in_path(
            "SELECT COUNT(*) FROM automations "
            "WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL",
            (self.current_user_id,),
            state_path,
        )
        automations_on_count = active_automations[0][0] if active_automations else 0

        active_scenes = self._execute_query_in_path(
            "SELECT COUNT(*) FROM scenes "
            "WHERE user_id = ? AND is_active = 1 AND deleted_at IS NULL",
            (self.current_user_id,),
            state_path,
        )
        scenes_on_count = active_scenes[0][0] if active_scenes else 0

        logger.info(
            "Room %r: devices_on=%d, automations_active=%d, scenes_active=%d",
            room_name, devices_on_count, automations_on_count, scenes_on_count,
        )

        return {
            "all_devices_off": devices_on_count == 0,
            "all_automations_off": automations_on_count == 0,
            "all_scenes_off": scenes_on_count == 0,
        }
