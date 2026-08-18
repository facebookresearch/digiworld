# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetPrimaryAccountScenario(BankingScenario, ComposableScenario):
    """Verify that the specified account is now the primary account."""

    def _get_checks(self, state_path):
        account_name = getattr(self, "account_name", None)
        if not account_name:
            raise ValueError("account_name parameter is required")

        target_query = (
            "SELECT id, is_primary FROM accounts "
            "WHERE user_id = ? AND account_name = ? AND status = 'active'"
        )
        target_rows = self._execute_query_in_path(
            target_query, (self.current_user_id, account_name), state_path
        )

        if not target_rows:
            raise ValueError(
                f"No active account found with name '{account_name}' "
                f"for user {self.current_user_id}"
            )

        target_is_primary = target_rows[0][1]
        target_id = target_rows[0][0]

        others_query = (
            "SELECT id, is_primary FROM accounts "
            "WHERE user_id = ? AND id != ? AND status = 'active'"
        )
        others_rows = self._execute_query_in_path(
            others_query, (self.current_user_id, target_id), state_path
        )

        others_not_primary = all(row[1] == 0 for row in others_rows)

        logger.info(
            f"Account '{account_name}' (id={target_id}) is_primary={target_is_primary}, "
            f"all others not primary={others_not_primary}"
        )
        return {
            "target_is_primary": target_is_primary == 1,
            "others_not_primary": others_not_primary,
        }
