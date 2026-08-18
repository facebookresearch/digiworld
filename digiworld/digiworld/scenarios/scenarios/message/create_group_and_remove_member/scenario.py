import logging
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateGroupAndRemoveMemberScenario(MessageScenario, ComposableScenario):
    """Verify that a group was created with the three latest messaged contacts
    and that the third latest contact was subsequently removed."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        group_name = self.group_name
        group_description = self.group_description

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
                "correct_members_added": False,
                "member_removed": False,
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

        # The third latest contact (index 2) should be removed
        third_latest_contact = seen[2]

        # Check that all members were added to the group at some point.
        # We look at all group_members rows (including exited ones) to verify
        # they were all added.
        all_member_rows = self._execute_query_in_path(
            "SELECT user_id FROM group_members WHERE group_id = ?",
            (group_id,),
            state_path,
        )
        all_member_ids = {row[0] for row in all_member_rows}

        correct_members_added = all(cid in all_member_ids for cid in seen)

        # --- Part 2: member removed check (from remove_from_group) ---

        # Check that the third latest contact has been removed (exited)
        exited_rows = self._execute_query_in_path(
            "SELECT user_id FROM group_members "
            "WHERE group_id = ? AND user_id = ? AND exited_at IS NOT NULL",
            (group_id, third_latest_contact),
            state_path,
        )
        member_removed = len(exited_rows) > 0

        # Also verify this contact is no longer active in the group
        active_rows = self._execute_query_in_path(
            "SELECT user_id FROM group_members "
            "WHERE group_id = ? AND user_id = ? AND exited_at IS NULL",
            (group_id, third_latest_contact),
            state_path,
        )
        member_removed = member_removed or len(active_rows) == 0

        logger.info(
            f"Create group and remove member check: exists={group_exists}, "
            f"desc_matches={group_description_matches}, "
            f"correct_members_added={correct_members_added}, "
            f"third_latest={third_latest_contact}, "
            f"member_removed={member_removed}, "
            f"expected_contacts={seen}, all_member_ids={all_member_ids}"
        )

        return {
            "group_exists": group_exists,
            "group_description_matches": group_description_matches,
            "correct_members_added": correct_members_added,
            "member_removed": member_removed,
        }
