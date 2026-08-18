# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class EditRoomDescriptionScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a room's description was updated to the expected value."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
            SELECT description
            FROM rooms
            WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL
        """
        results = self._execute_query_in_path(
            query, (self.room_name, self.current_user_id), state_path
        )

        if not results:
            raise ValueError(
                f"Room {self.room_name!r} not found for user {self.current_user_id}"
            )

        db_description = results[0][0] or ""
        return {
            "description_updated": db_description.strip().lower() == self.description.strip().lower(),
        }
