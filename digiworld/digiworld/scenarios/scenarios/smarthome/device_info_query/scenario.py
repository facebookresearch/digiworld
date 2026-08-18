# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

INFO_TYPE_COLUMN = {
    "battery percentage": "battery",
    "connection percentage": "signal_strength",
}


class DeviceInfoQueryScenario(SmartHomeScenario, ComposableScenario):
    """Verify that the agent correctly reports a device's battery or signal strength."""

    def _get_checks(self, state_path):
        info_type = getattr(self, "info_type", None)
        device_name = getattr(self, "device_name", None)
        if not info_type:
            raise ValueError("info_type parameter is required")
        if not device_name:
            raise ValueError("device_name parameter is required")

        column = INFO_TYPE_COLUMN.get(info_type.lower())
        if column is None:
            raise ValueError(
                f"Unknown info_type {info_type!r}. "
                f"Supported: {list(INFO_TYPE_COLUMN.keys())}"
            )

        query = (
            f"SELECT {column} FROM devices "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? "
            "AND deleted_at IS NULL"
        )
        rows = self._execute_query_in_path(
            query, (device_name, self.current_user_id), self.initial_state_path
        )
        if not rows:
            raise ValueError(
                f"No device named {device_name!r} found in "
                f"{self.initial_state_path}"
            )

        expected = int(rows[0][0])
        logger.info(
            f"Expected {info_type}: {expected}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_correct": numeric_match(self.agent_answer, expected),
        }
