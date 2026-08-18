# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class TurnOnDeviceScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a specific device has been turned on."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
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

        return {
            "device_was_off_initially": not bool(initial_rows[0][0]),
            "device_turned_on": bool(rows[0][0]),
        }
