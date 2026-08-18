# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class VoiceCallContactScenario(MessageScenario, ComposableScenario):
    """Verify that a voice call was initiated to the specified contact."""

    def _get_checks(self, state_path):
        contact_name = getattr(self, "contact_name", None)
        if not contact_name:
            raise ValueError("contact_name parameter is required")

        query = """
        SELECT ch.id, ch.caller_id, ch.receiver_id, ch.call_type
        FROM call_history ch
        JOIN users u ON ch.receiver_id = u.id
        WHERE ch.caller_id = ? AND u.name LIKE ?
        ORDER BY ch.timestamp DESC
        """
        params = (self.current_user_id, f"%{contact_name}%")

        _, _, added = self.compare_database_records(
            self.initial_state_path, state_path, query, params
        )

        call_initiated = any(row[3] == "voice" for row in added)

        logger.info(
            "Voice call to '%s': %d new call_history records, "
            "voice call %s",
            contact_name,
            len(added),
            "found" if call_initiated else "not found",
        )

        return {
            "call_initiated": call_initiated,
        }
