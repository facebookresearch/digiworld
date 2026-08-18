# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class RoomInfoQueryScenario(SmartHomeScenario, ComposableScenario):
    """Verify that the agent correctly answers a question about a room."""

    def _get_checks(self, state_path):
        question = getattr(self, "question", None)
        room_name = getattr(self, "room_name", None)
        if not question:
            raise ValueError("question parameter is required")
        if not room_name:
            raise ValueError("room_name parameter is required")

        q_lower = question.lower()
        if "how many devices" in q_lower or "device" in q_lower:
            expected = self._count_devices_in_room(room_name)
        elif "floor" in q_lower:
            expected = self._get_room_floor(room_name)
        else:
            raise ValueError(f"Unknown question type: {question!r}")

        logger.info(
            f"Expected answer: {expected}, agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_correct": numeric_match(self.agent_answer, expected),
        }

    def _count_devices_in_room(self, room_name):
        query = (
            "SELECT COUNT(*) FROM devices d "
            "JOIN rooms r ON d.room_id = r.id "
            "WHERE LOWER(r.name) = LOWER(?) AND r.user_id = ? "
            "AND d.deleted_at IS NULL AND r.deleted_at IS NULL"
        )
        rows = self._execute_query_in_path(
            query, (room_name, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(f"No room named {room_name!r} found")
        return int(rows[0][0])

    def _get_room_floor(self, room_name):
        query = (
            "SELECT floor FROM rooms "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? "
            "AND deleted_at IS NULL"
        )
        rows = self._execute_query_in_path(
            query, (room_name, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(f"No room named {room_name!r} found")
        return int(rows[0][0])
