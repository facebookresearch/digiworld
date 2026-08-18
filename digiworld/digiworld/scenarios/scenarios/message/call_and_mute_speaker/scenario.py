import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CallAndMuteSpeakerScenario(MessageScenario, ComposableScenario):
    """Verify that a voice call was initiated and the microphone is muted
    with speaker enabled."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        contact_name = getattr(self, "contact_name", None)
        if not contact_name:
            raise ValueError("contact_name parameter is required")

        # --- Part 1: call initiated check (from voice_call_contact) ---

        query = """
        SELECT ch.id, ch.caller_id, ch.receiver_id, ch.call_type
        FROM call_history ch
        JOIN users caller ON ch.caller_id = caller.id
        JOIN users receiver ON ch.receiver_id = receiver.id
        WHERE (
            ch.caller_id = ? AND receiver.name LIKE ?
        ) OR (
            ch.receiver_id = ? AND caller.name LIKE ?
        )
        ORDER BY ch.timestamp DESC
        """
        params = (
            self.current_user_id,
            f"%{contact_name}%",
            self.current_user_id,
            f"%{contact_name}%",
        )

        _, _, added = self.compare_database_records(
            self.initial_state_path, state_path, query, params
        )

        call_initiated = any(row[3] == "voice" for row in added)

        # --- Part 2: mute and speaker checks (from mute_and_speaker) ---

        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        session = self.get_current_session(rootstore)
        if not session:
            return {
                "call_initiated": call_initiated,
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

        on_call_screen = screen_name == "Call"
        active_contact_name = str(form_data.get("contactName", ""))
        correct_contact = contact_name.lower() in active_contact_name.lower()
        microphone_muted = form_data.get("isMuted", False) is True
        speaker_on = form_data.get("isSpeakerOn", False) is True

        logger.info(
            "Call and mute/speaker check: contact='%s', call_initiated=%s, "
            "added_calls=%r, active_contact=%r, correct_contact=%s, "
            "on_call_screen=%s, mic_muted=%s, speaker=%s",
            contact_name, call_initiated,
            added, active_contact_name, correct_contact,
            on_call_screen, microphone_muted, speaker_on,
        )

        return {
            "call_initiated": call_initiated,
            "on_call_screen": on_call_screen and correct_contact,
            "microphone_muted": microphone_muted,
            "speaker_on": speaker_on,
        }
