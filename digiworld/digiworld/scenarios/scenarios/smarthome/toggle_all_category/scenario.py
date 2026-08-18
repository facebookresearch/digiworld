# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_ACTIVATE_ACTIONS = {"turn on", "enable"}
_DEACTIVATE_ACTIONS = {"turn off", "disable"}

_TABLE_CONFIG = {
    "devices": {"table": "devices", "column": "is_on"},
    "scenes": {"table": "scenes", "column": "is_active"},
    "automations": {"table": "automations", "column": "is_active"},
}


class ToggleAllCategoryScenario(SmartHomeScenario, ComposableScenario):
    """Verify that all items of a given category have been toggled to the
    expected state (on/off or active/inactive)."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        action = getattr(self, "action", None)
        item_type = getattr(self, "item_type", None)
        if not action:
            raise ValueError("action parameter is required")
        if not item_type:
            raise ValueError("item_type parameter is required")

        action_lower = action.strip().lower()
        if action_lower in _ACTIVATE_ACTIONS:
            target_value = 1
        elif action_lower in _DEACTIVATE_ACTIONS:
            target_value = 0
        else:
            raise ValueError(
                f"Unknown action {action!r}; expected one of: "
                "Turn on, Turn off, Enable, Disable"
            )

        item_key = item_type.strip().lower()
        cfg = _TABLE_CONFIG.get(item_key)
        if cfg is None:
            raise ValueError(
                f"Unknown item_type {item_type!r}; expected one of: "
                "devices, scenes, automations"
            )

        wrong_state = 0 if target_value == 1 else 1
        query = (
            f"SELECT COUNT(*) FROM {cfg['table']} "
            f"WHERE user_id = ? AND {cfg['column']} = ? AND deleted_at IS NULL"
        )

        initial_rows = self._execute_query_in_path(
            query, (self.current_user_id, wrong_state), self.initial_state_path,
        )
        initial_wrong_count = initial_rows[0][0] if initial_rows else 0

        rows = self._execute_query_in_path(
            query, (self.current_user_id, wrong_state), state_path,
        )
        wrong_count = rows[0][0] if rows else 0

        logger.info(
            "Action=%r item_type=%r target=%d initial_wrong=%d wrong_state_count=%d",
            action, item_type, target_value, initial_wrong_count, wrong_count,
        )

        if initial_wrong_count == 0:
            logger.warning(
                "All %s were already in target state (%d) — task is vacuous",
                item_type, target_value,
            )

        return {
            "all_toggled": wrong_count == 0,
        }
