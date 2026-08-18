# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateGroupWithLatestContactsScenario(MessageScenario, ComposableScenario):
    """Verify that a group was created with the three latest messaged contacts."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        group_name = self.group_name
        group_description = self.group_description

        group_rows = self._execute_query_in_path(
            "SELECT id, description FROM groups "
            "WHERE name = ? AND is_active = 1 AND deleted_by IS NULL",
            (group_name,),
            state_path,
        )

        if not group_rows:
            logger.info(f"No group found with name '{group_name}'")
            return {
                "group_exists": False,
                "group_description_matches": False,
                "correct_members": False,
            }

        group_id = group_rows[0][0]
        actual_description = group_rows[0][1] or ""

        group_exists = True
        group_description_matches = (
            actual_description.strip().lower() == group_description.strip().lower()
            or group_description.strip().lower() in actual_description.strip().lower()
        )

        contact_rows = self._execute_query_in_path(
            "SELECT contact_id, MAX(timestamp) AS latest "
            "FROM ("
            "  SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS contact_id, "
            "  timestamp FROM messages "
            "  WHERE (sender_id = ? OR receiver_id = ?) "
            "    AND (deleted_by IS NULL OR (',' || REPLACE(deleted_by, ' ', '') || ',') "
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

        logger.info(
            f"Create group check: exists={group_exists}, "
            f"desc_matches={group_description_matches}, "
            f"correct_members={correct_members}, "
            f"expected={seen}, actual_members={member_ids}"
        )

        return {
            "group_exists": group_exists,
            "group_description_matches": group_description_matches,
            "correct_members": correct_members,
        }