# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class MuteAndSpeakerScenario(MessageScenario, ComposableScenario):
    """Verify that the microphone is muted and speaker is enabled during a call."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        session = self.get_current_session(rootstore)
        if not session:
            return {
                "on_call_screen": False,
                "microphone_muted": False,
                "speaker_on": False,
            }

        screen_name = session.get("data", {}).get("screenName", "")
        form_data = (
            session.get("data", {})
            .get("sessionData", {})
            .get("formData", {})
        )

        return {
            "on_call_screen": screen_name == "Call",
            "microphone_muted": form_data.get("isMuted", False) is True,
            "speaker_on": form_data.get("isSpeakerOn", False) is True,
        }
