# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario


class ConfigureSmartAcScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a Smart AC was turned on and configured with the expected
    temperature, fan speed, mode, and scheduling."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        checks: Dict[str, bool] = {}

        rows = self._execute_query_in_path(
            "SELECT is_on, properties FROM devices "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.device_name, self.current_user_id),
            state_path,
        )

        if not rows:
            raise ValueError(f"Device '{self.device_name}' not found")

        is_on, props_str = rows[0]
        props = json.loads(props_str) if props_str else {}

        checks["device_turned_on"] = bool(is_on)
        checks["temperature_set"] = props.get("temperature") == int(self.temperature)
        checks["fan_speed_set"] = props.get("fan_speed") == int(self.fan_speed)
        checks["mode_set"] = props.get("mode") == self.mode.lower()
        checks["scheduling_set"] = props.get("scheduling") == (self.scheduling.lower() == "enable")

        return checks
