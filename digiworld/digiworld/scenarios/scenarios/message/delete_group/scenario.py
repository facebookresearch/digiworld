# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class DeleteGroupScenario(MessageScenario, ComposableScenario):
    """Verify that a group chat was fully deleted: messages cleared,
    members removed, and the group itself soft-deleted."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        group_rows = self._execute_query_in_path(
            "SELECT id, deleted_by FROM groups WHERE name = ?",
            (self.group_name,),
            state_path,
        )
        if not group_rows:
            raise ValueError(f"No group found with name '{self.group_name}'")

        group_id = group_rows[0][0]
        group_deleted_by = group_rows[0][1] or ""

        group_deleted = self.current_user_id in group_deleted_by

        msg_rows = self._execute_query_in_path(
            "SELECT id, deleted_by FROM group_messages WHERE group_id = ?",
            (group_id,),
            state_path,
        )
        if msg_rows:
            messages_cleared = all(
                self.current_user_id in (row[1] or "")
                for row in msg_rows
            )
        else:
            messages_cleared = True

        member_rows = self._execute_query_in_path(
            "SELECT user_id, exited_at FROM group_members "
            "WHERE group_id = ? AND user_id != ?",
            (group_id, self.current_user_id),
            state_path,
        )
        if member_rows:
            members_removed = all(row[1] is not None for row in member_rows)
        else:
            members_removed = True

        logger.info(
            f"Delete group check: group='{self.group_name}', "
            f"group_deleted={group_deleted}, "
            f"messages_cleared={messages_cleared}, "
            f"members_removed={members_removed}"
        )

        return {
            "messages_cleared": messages_cleared,
            "members_removed": members_removed,
            "group_deleted": group_deleted,
        }
