# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendGroupMessageScenario(MessageScenario, ComposableScenario):
    """Verify that a message was sent in a group chat."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = (
            "SELECT gm.id, gm.content, gm.sender_id "
            "FROM group_messages gm "
            "JOIN groups g ON gm.group_id = g.id "
            "WHERE g.name = ? AND gm.sender_id = ? "
            "ORDER BY gm.timestamp DESC"
        )
        params = (self.group_name, self.current_user_id)

        _, _, new_messages = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            params,
        )

        message_sent = any(
            self.message_content.lower() in (msg[1] or "").lower()
            for msg in new_messages
        )

        logger.info(
            f"Send group message check: group='{self.group_name}', "
            f"new_messages={len(new_messages)}, sent={message_sent}"
        )

        return {"message_sent": message_sent}
