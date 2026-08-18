# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class RemoveFromGroupScenario(MessageScenario, ComposableScenario):
    """Verify that exactly one member was removed from the group chat."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        group_rows = self._execute_query_in_path(
            "SELECT id FROM groups WHERE name = ?",
            (self.group_name,),
            state_path,
        )
        if not group_rows:
            raise ValueError(f"No group found with name '{self.group_name}'")
        group_id = group_rows[0][0]

        initial_active = self._execute_query_in_path(
            "SELECT user_id FROM group_members "
            "WHERE group_id = ? AND exited_at IS NULL",
            (group_id,),
            self.initial_state_path,
        )
        final_active = self._execute_query_in_path(
            "SELECT user_id FROM group_members "
            "WHERE group_id = ? AND exited_at IS NULL",
            (group_id,),
            state_path,
        )

        member_count_decreased = (len(initial_active) - len(final_active)) == 1

        initial_exited = self._execute_query_in_path(
            "SELECT user_id FROM group_members "
            "WHERE group_id = ? AND exited_at IS NOT NULL",
            (group_id,),
            self.initial_state_path,
        )
        final_exited = self._execute_query_in_path(
            "SELECT user_id FROM group_members "
            "WHERE group_id = ? AND exited_at IS NOT NULL",
            (group_id,),
            state_path,
        )

        initial_exited_ids = {row[0] for row in initial_exited}
        final_exited_ids = {row[0] for row in final_exited}
        newly_exited = final_exited_ids - initial_exited_ids

        member_exited = len(newly_exited) == 1

        logger.info(
            f"Remove from group check: group='{self.group_name}', "
            f"initial_active={len(initial_active)}, "
            f"final_active={len(final_active)}, "
            f"count_decreased={member_count_decreased}, "
            f"newly_exited={newly_exited}, member_exited={member_exited}"
        )

        return {
            "member_count_decreased": member_count_decreased,
            "member_exited": member_exited,
        }
