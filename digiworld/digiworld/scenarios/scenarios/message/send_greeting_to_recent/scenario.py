# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendGreetingToRecentScenario(MessageScenario, ComposableScenario):
    """Verify a greeting was sent to the most recent conversation partner."""

    def _find_most_recent_contact(self, state_path):
        """Determine the most recent contact from the given state's DB."""
        rows = self._execute_query_in_path(
            "SELECT CASE WHEN sender_id = ? THEN receiver_id "
            "ELSE sender_id END AS contact_id "
            "FROM messages "
            "WHERE (sender_id = ? OR receiver_id = ?) "
            "  AND (deleted_by IS NULL OR "
            "       (',' || REPLACE(deleted_by, ' ', '') || ',') NOT LIKE '%,' || ? || ',%') "
            "ORDER BY timestamp DESC "
            "LIMIT 1",
            (
                self.current_user_id,
                self.current_user_id,
                self.current_user_id,
                self.current_user_id,
            ),
            state_path,
        )
        if not rows:
            raise ValueError(
                f"No messages found for user {self.current_user_id} "
                f"in {state_path}; cannot determine most recent contact"
            )
        return rows[0][0]

    def _get_checks(self, state_path):
        greeting = getattr(self, "greeting", None)
        if not greeting:
            raise ValueError("greeting parameter is required")

        recent_contact_id = self._find_most_recent_contact(self.initial_state_path)
        logger.info("Most recent contact from initial state: %s", recent_contact_id)

        query = (
            "SELECT id, content FROM messages "
            "WHERE sender_id = ? AND receiver_id = ? "
            "ORDER BY timestamp DESC"
        )
        _, _, new_messages = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_id, recent_contact_id),
        )

        message_sent = any(
            row[1] is not None and greeting.lower() in row[1].lower()
            for row in new_messages
        )

        return {"message_sent": message_sent}
