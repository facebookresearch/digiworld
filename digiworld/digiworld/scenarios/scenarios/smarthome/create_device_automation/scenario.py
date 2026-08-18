# Copyright (c) Meta Platforms, Inc. and affiliates.
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario


class CreateDeviceAutomationScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a device automation was created with the expected
    name, description, trigger type, and linked device."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
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

        rows = self._execute_query_in_path(
            "SELECT 1 FROM automation_actions aa JOIN devices d ON aa.device_id = d.id "
            "WHERE aa.automation_id = ? AND LOWER(d.name) = LOWER(?)",
            (automation_id, self.device_name),
            state_path,
        )
        device_linked = len(rows) > 0

        return {
            "automation_exists": True,
            "description_matches": description_ok,
            "trigger_type_matches": trigger_ok,
            "device_linked": device_linked,
        }
