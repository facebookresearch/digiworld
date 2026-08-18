"""Composed scenario: create a device automation, then query device info."""

import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

INFO_TYPE_COLUMN = {
    "battery percentage": "battery",
    "connection percentage": "signal_strength",
}


class CreateAutomationAndQueryDeviceScenario(SmartHomeScenario, ComposableScenario):
    """Verify an automation was created and the agent reports device info."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # --- Automation checks (from create_device_automation) ---
        rows = self._execute_query_in_path(
            "SELECT id, description, trigger_type FROM automations "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.automation_name, self.current_user_id),
            state_path,
        )
        row = rows[0] if rows else None

        if row is None:
            return {
                "automation_exists": False,
                "description_matches": False,
                "trigger_type_matches": False,
                "device_linked": False,
                "answer_correct": False,
            }

        automation_id, db_description, db_trigger_type = row

        description_ok = (
            self.automation_description.strip().lower()
            in (db_description or "").strip().lower()
        )

        trigger_ok = (
            (db_trigger_type or "").strip().lower()
            == self.trigger_type.strip().lower()
        )

        device_rows = self._execute_query_in_path(
            "SELECT 1 FROM automation_actions aa "
            "JOIN devices d ON aa.device_id = d.id "
            "WHERE aa.automation_id = ? AND LOWER(d.name) = LOWER(?)",
            (automation_id, self.device_name),
            state_path,
        )
        device_linked = len(device_rows) > 0

        # --- Device info query check (from device_info_query) ---
        info_type = getattr(self, "info_type", None)
        if not info_type:
            raise ValueError("info_type parameter is required")

        column = INFO_TYPE_COLUMN.get(info_type.lower())
        if column is None:
            raise ValueError(
                f"Unknown info_type {info_type!r}. "
                f"Supported: {list(INFO_TYPE_COLUMN.keys())}"
            )

        info_query = (
            f"SELECT {column} FROM devices "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? "
            "AND deleted_at IS NULL"
        )
        info_rows = self._execute_query_in_path(
            info_query, (self.device_name, self.current_user_id),
            self.initial_state_path,
        )
        if not info_rows:
            raise ValueError(
                f"No device named {self.device_name!r} found in "
                f"{self.initial_state_path}"
            )

        expected = int(info_rows[0][0])
        logger.info(
            f"Expected {info_type}: {expected}, "
            f"agent answer: {self.agent_answer!r}"
        )

        return {
            "automation_exists": True,
            "description_matches": description_ok,
            "trigger_type_matches": trigger_ok,
            "device_linked": device_linked,
            "answer_correct": numeric_match(self.agent_answer, expected),
        }
