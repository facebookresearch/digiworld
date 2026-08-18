# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario


class ConfigureSmartBulbScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a Smart Bulb was turned on and configured with the expected settings."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
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

        return {
            "device_turned_on": bool(is_on),
            "brightness_set": props.get("brightness") == int(self.brightness),
            "chromaticity_set": abs(props.get("color_temperature", 0) - int(self.chromaticity)) <= 100,
            "color_mode_set": props.get("color_mode", "").lower() == self.color_mode.lower(),
            "scheduling_set": props.get("scheduling") == (self.scheduling.lower() == "enable"),
        }
