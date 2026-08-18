# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.smarthome.base_scenario import SmartHomeScenario

SPEAKER_TYPE_TO_PROP = {
    "music": "music_playback",
    "voice": "voice_assistant",
    "BT": "bluetooth",
    "bluetooth": "bluetooth",
}

SPEAKER_TYPE_TO_MODE = {
    "music": "music",
    "voice": "voice",
    "BT": "bluetooth",
    "bluetooth": "bluetooth",
}


class ConfigureSmartSpeakerScenario(SmartHomeScenario, ComposableScenario):
    """Verify that a smart speaker was turned on with the correct volume,
    type property, and playback state."""

    def _select_device_row(self, rows):
        def _sort_key(row):
            device_id, _is_on, props_str = row
            props = json.loads(props_str) if props_str else {}
            has_audio_mode = "audio_mode" in props
            return (has_audio_mode, int(device_id))

        return max(rows, key=_sort_key)

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        checks: Dict[str, bool] = {}

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

        checks["device_turned_on"] = bool(is_on)
        checks["volume_set"] = props.get("volume", 0) == int(self.volume)

        prop_name = SPEAKER_TYPE_TO_PROP.get(self.speaker_type)
        expected_mode = SPEAKER_TYPE_TO_MODE.get(self.speaker_type)
        if prop_name is None or expected_mode is None:
            raise ValueError(f"Unknown speaker type: {self.speaker_type}")

        audio_mode = props.get("audio_mode")
        if audio_mode is not None:
            checks["speaker_type_set"] = str(audio_mode).strip().lower() == expected_mode
        elif expected_mode == "music":
            # The app treats missing audio_mode as music by default.
            checks["speaker_type_set"] = True
        else:
            checks["speaker_type_set"] = props.get(prop_name) is True

        checks["is_playing"] = props.get("is_playing") is True

        return checks
