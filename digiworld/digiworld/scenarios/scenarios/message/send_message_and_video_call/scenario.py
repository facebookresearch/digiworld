import logging
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendMessageAndVideoCallScenario(MessageScenario, ComposableScenario):
    """Verify that a message was sent to a contact and then a video call
    was initiated to the same contact."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        contact_name = getattr(self, "contact_name", None)
        if not contact_name:
            raise ValueError("contact_name parameter is required")

        # --- Part 1: message sent check (from send_message_to) ---

        msg_query = """
        SELECT m.id, m.sender_id, m.receiver_id, m.content, m.timestamp
        FROM messages m
        JOIN users u ON u.id = m.receiver_id
        WHERE m.sender_id = ? AND u.name LIKE ?
        ORDER BY m.timestamp DESC
        """
        msg_params = (self.current_user_id, f"%{contact_name}%")

        _, _, new_messages = self.compare_database_records(
            self.initial_state_path, state_path, msg_query, msg_params
        )

        message_sent = len(new_messages) > 0

        # --- Part 2: video call check (from video_call_contact) ---

        call_query = """
        SELECT ch.id, ch.caller_id, ch.receiver_id, ch.call_type
        FROM call_history ch
        JOIN users u ON ch.receiver_id = u.id
        WHERE ch.caller_id = ? AND u.name LIKE ?
        ORDER BY ch.timestamp DESC
        """
        call_params = (self.current_user_id, f"%{contact_name}%")

        _, _, new_calls = self.compare_database_records(
            self.initial_state_path, state_path, call_query, call_params
        )

        video_call_initiated = any(row[3] == "video" for row in new_calls)

        logger.info(
            "Send message and video call check: contact='%s', "
            "message_sent=%s (new_messages=%d), "
            "video_call_initiated=%s (new_calls=%d)",
            contact_name, message_sent, len(new_messages),
            video_call_initiated, len(new_calls),
        )

        return {
            "message_sent": message_sent,
            "video_call_initiated": video_call_initiated,
        }
