import logging
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateGroupAndSendMessageScenario(MessageScenario, ComposableScenario):
    """Verify that a group was created with the three latest messaged contacts
    and that a message was sent in the new group chat."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        group_name = self.group_name
        group_description = self.group_description
        message_content = self.message_content

        # --- Part 1: group creation checks (from create_group_with_latest_contacts) ---

        group_rows = self._execute_query_in_path(
            "SELECT id, description FROM groups "
            "WHERE name = ? AND is_active = 1 "
            "  AND (deleted_by IS NULL OR "
            "       (',' || REPLACE(deleted_by, ' ', '') || ',') NOT LIKE '%,' || ? || ',%')",
            (group_name, self.current_user_id),
            state_path,
        )

        if not group_rows:
            logger.info(f"No group found with name '{group_name}'")
            return {
                "group_exists": False,
                "group_description_matches": False,
                "correct_members": False,
                "message_sent": False,
            }

        group_id = group_rows[0][0]
        actual_description = group_rows[0][1] or ""

        group_exists = True
        group_description_matches = (
            actual_description.strip().lower() == group_description.strip().lower()
            or group_description.strip().lower() in actual_description.strip().lower()
        )

        # Find the three latest messaged contacts from the initial state
        contact_rows = self._execute_query_in_path(
            "SELECT contact_id, MAX(timestamp) AS latest "
            "FROM ("
            "  SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS contact_id, "
            "  timestamp FROM messages "
            "  WHERE (sender_id = ? OR receiver_id = ?) "
            "    AND (deleted_by IS NULL OR "
            "         (',' || REPLACE(deleted_by, ' ', '') || ',') "
            "         NOT LIKE '%,' || ? || ',%')"
            ") GROUP BY contact_id ORDER BY latest DESC LIMIT 3",
            (
                self.current_user_id,
                self.current_user_id,
                self.current_user_id,
                self.current_user_id,
            ),
            self.initial_state_path,
        )

        seen = [row[0] for row in contact_rows]

        if len(seen) < 3:
            raise ValueError(
                f"Expected at least 3 distinct contacts in initial state, found {len(seen)}"
            )

        member_rows = self._execute_query_in_path(
            "SELECT user_id FROM group_members "
            "WHERE group_id = ? AND exited_at IS NULL",
            (group_id,),
            state_path,
        )
        member_ids = {row[0] for row in member_rows}

        correct_members = all(cid in member_ids for cid in seen)

        # --- Part 2: message sent check (from send_group_message) ---

        msg_query = (
            "SELECT gm.id, gm.content, gm.sender_id "
            "FROM group_messages gm "
            "JOIN groups g ON gm.group_id = g.id "
            "WHERE g.name = ? AND gm.sender_id = ? "
            "ORDER BY gm.timestamp DESC"
        )
        msg_params = (group_name, self.current_user_id)

        _, _, new_messages = self.compare_database_records(
            self.initial_state_path,
            state_path,
            msg_query,
            msg_params,
        )

        message_sent = any(
            message_content.lower() in (msg[1] or "").lower()
            for msg in new_messages
        )

        logger.info(
            f"Create group and send message check: exists={group_exists}, "
            f"desc_matches={group_description_matches}, "
            f"correct_members={correct_members}, "
            f"expected_contacts={seen}, actual_members={member_ids}, "
            f"new_messages={len(new_messages)}, message_sent={message_sent}"
        )

        return {
            "group_exists": group_exists,
            "group_description_matches": group_description_matches,
            "correct_members": correct_members,
            "message_sent": message_sent,
        }
