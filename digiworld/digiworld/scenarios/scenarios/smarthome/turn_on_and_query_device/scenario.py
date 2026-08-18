# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: turn on a device, then query info about it."""

import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match, substring_match
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

INFO_TYPE_COLUMN = {
    "battery percentage": "battery",
    "connection percentage": "signal_strength",
}


class TurnOnAndQueryDeviceScenario(SmartHomeScenario, ComposableScenario):
    """Verify a device was turned on and the agent reports its info."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Turn on checks (from turn_on_device) ---
        query = (
            "SELECT is_on FROM devices "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL"
        )
        params = (self.device_name, self.current_user_id)

        initial_rows = self._execute_query_in_path(
            query, params, self.initial_state_path,
        )
        if not initial_rows:
            raise ValueError(f"Device '{self.device_name}' not found in initial state")

        rows = self._execute_query_in_path(query, params, state_path)
        if not rows:
            raise ValueError(f"Device '{self.device_name}' not found")

        device_was_off = not bool(initial_rows[0][0])
        device_on = bool(rows[0][0])

        # --- Info query check ---
        info_type = getattr(self, "info_type", "status")

        if info_type.lower() == "status":
            # After turning on, the status should be "on"
            answer_ok = substring_match(self.agent_answer, "on")
        elif info_type.lower() in INFO_TYPE_COLUMN:
            # Query battery or signal strength from the current state
            column = INFO_TYPE_COLUMN[info_type.lower()]
            info_query = (
                f"SELECT {column} FROM devices "
                "WHERE LOWER(name) = LOWER(?) AND user_id = ? "
                "AND deleted_at IS NULL"
            )
            info_rows = self._execute_query_in_path(
                info_query, (self.device_name, self.current_user_id),
                state_path,
            )
            if not info_rows:
                raise ValueError(
                    f"No device named {self.device_name!r} found in {state_path}"
                )
            expected = int(info_rows[0][0])
            answer_ok = numeric_match(self.agent_answer, expected)
            logger.info(
                f"Expected {info_type}: {expected}, "
                f"agent answer: {self.agent_answer!r}"
            )
        else:
            raise ValueError(
                f"Unknown info_type {info_type!r}. "
                f"Supported: status, {', '.join(INFO_TYPE_COLUMN.keys())}"
            )

        return {
            "device_was_off_initially": device_was_off,
            "device_turned_on": device_on,
            "answer_correct": answer_ok,
        }
