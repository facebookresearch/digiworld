# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateDeviceSceneScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a scene was created with the correct metadata and that the
    expected device is linked to it via scene_devices."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        scene_row = self._find_scene(state_path)
        if scene_row is None:
            logger.info(f"Scene '{self.scene_name}': not found")
            return {
                "scene_exists": False,
                "description_matches": False,
                "icon_matches": False,
                "device_linked": False,
            }

        scene_id, db_description, db_icon = scene_row

        desc_ok = (
            self.scene_description.strip().lower()
            in (db_description or "").strip().lower()
        )
        icon_ok = (db_icon or "").strip().lower() == self.icon.strip().lower()
        device_ok = self._check_device_linked(state_path, scene_id)

        logger.info(
            f"Scene '{self.scene_name}': exists=True, "
            f"desc_ok={desc_ok}, icon_ok={icon_ok}, device_ok={device_ok}"
        )
        return {
            "scene_exists": True,
            "description_matches": desc_ok,
            "icon_matches": icon_ok,
            "device_linked": device_ok,
        }

    def _find_scene(self, state_path: str):
        query = """
            SELECT id, description, icon
            FROM scenes
            WHERE LOWER(name) = LOWER(?) AND user_id = ?
              AND deleted_at IS NULL
        """
        rows = self._execute_query_in_path(
            query, (self.scene_name, self.current_user_id), state_path
        )
        if not rows:
            return None
        return rows[0]

    def _check_device_linked(self, state_path: str, scene_id: int) -> bool:
        query = """
            SELECT sd.id
            FROM scene_devices sd
            JOIN devices d ON sd.device_id = d.id
            WHERE sd.scene_id = ?
              AND LOWER(d.name) = LOWER(?)
              AND d.user_id = ?
              AND d.deleted_at IS NULL
        """
        rows = self._execute_query_in_path(
            query, (scene_id, self.device_name, self.current_user_id), state_path
        )
        return len(rows) > 0
