# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
from typing import Dict

from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario
from digiworld.scenarios.verification import ComposableScenario


class ConfigureSecurityCameraScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a Security Camera was turned on and configured with the expected settings."""

    def _select_device_row(self, rows):
        def _sort_key(row):
            device_id, _is_on, props_str = row
            props = json.loads(props_str) if props_str else {}
            has_runtime_camera_props = any(
                key in props for key in ("two_way_audio", "recording", "cloud_storage")
            )
            return (has_runtime_camera_props, int(device_id))

        return max(rows, key=_sort_key)

    @staticmethod
    def _recording_matches(props, expected_enabled: bool) -> bool:
        if "recording" in props:
            return bool(props.get("recording")) == expected_enabled
        return bool(props.get("recording_enabled")) == expected_enabled

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        rows = self._execute_query_in_path(
            "SELECT id, is_on, properties FROM devices "
            "WHERE LOWER(name) = LOWER(?) AND user_id = ? AND deleted_at IS NULL",
            (self.device_name, self.current_user_id),
            state_path,
        )

        if not rows:
            raise ValueError(f"Device '{self.device_name}' not found")

        _device_id, is_on, props_str = self._select_device_row(rows)
        props = json.loads(props_str) if props_str else {}

        return {
            "device_turned_on": bool(is_on),
            "motion_detection_set": props.get("motion_detection") == (self.motion_detection.lower() == "enable"),
            "night_vision_set": props.get("night_vision") == (self.night_vision.lower() == "enable"),
            "two_way_audio_set": props.get("two_way_audio") == (self.two_way_audio.lower() == "enable"),
            "recording_set": self._recording_matches(
                props,
                self.recording.lower() == "enable",
            ),
            "cloud_storage_set": props.get("cloud_storage") == (self.cloud_storage.lower() == "enable"),
        }
