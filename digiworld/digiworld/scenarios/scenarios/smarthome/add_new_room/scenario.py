# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddNewRoomScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a new room was added with the correct attributes."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
            SELECT name, description, type, floor
            FROM rooms
            WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL
        """
        results = self._execute_query_in_path(
            query, (self.room_name, self.current_user_id), state_path
        )

        if not results:
            return {
                "room_created": False,
                "correct_description": False,
                "correct_type": False,
                "correct_floor": False,
            }

        row = results[0]
        db_name, db_description, db_type, db_floor = row

        return {
            "room_created": True,
            "correct_description": (db_description or "").lower() == self.description.lower(),
            "correct_type": (db_type or "").lower() == self.room_type.lower(),
            "correct_floor": int(db_floor) == int(self.floor),
        }
