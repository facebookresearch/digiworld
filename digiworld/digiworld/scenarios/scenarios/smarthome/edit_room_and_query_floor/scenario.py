# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: edit a room's description, then report its floor."""

import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class EditRoomAndQueryFloorScenario(SmartHomeScenario, ComposableScenario):
    """Verify the room description was updated and the agent reports the floor."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Description check (from edit_room_description) ---
        query = """
            SELECT description, floor
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
        db_floor = int(results[0][1])

        description_updated = (
            db_description.strip().lower() == self.description.strip().lower()
        )

        # --- Floor query check (from room_info_query) ---
        # Use initial_state_path for the expected floor value since
        # editing the description should not change the floor
        initial_results = self._execute_query_in_path(
            "SELECT floor FROM rooms "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.room_name, self.current_user_id),
            self.initial_state_path,
        )
        if not initial_results:
            raise ValueError(
                f"Room {self.room_name!r} not found in initial state"
            )

        expected_floor = int(initial_results[0][0])

        logger.info(
            f"Expected floor: {expected_floor}, "
            f"agent answer: {self.agent_answer!r}"
        )

        return {
            "description_updated": description_updated,
            "answer_correct": numeric_match(self.agent_answer, expected_floor),
        }
