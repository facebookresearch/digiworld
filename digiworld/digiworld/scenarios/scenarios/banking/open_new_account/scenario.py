# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class OpenNewAccountScenario(BankingScenario, ComposableScenario):
    """Verify that a new account was created with the specified name."""

    def _get_checks(self, state_path):
        account_name = getattr(self, "account_name", None)
        account_type = getattr(self, "account_type", None)
        if not account_name:
            raise ValueError("account_name parameter is required")
        if not account_type:
            raise ValueError("account_type parameter is required")

        search_term = f"%{account_type.lower()}%"
        type_rows = self._execute_query_in_path(
            "SELECT id FROM account_types "
            "WHERE LOWER(name) LIKE ? OR LOWER(code) LIKE ?",
            (search_term, search_term), state_path,
        )
        expected_type_ids = {r[0] for r in type_rows}

        query = (
            "SELECT a.id, a.account_name, a.account_type_id, at.name "
            "FROM accounts a "
            "JOIN account_types at ON a.account_type_id = at.id "
            "WHERE a.user_id = ? AND a.account_name = ?"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, account_name), state_path
        )

        account_exists = len(rows) > 0

        type_matches = False
        if rows and expected_type_ids:
            type_matches = rows[0][2] in expected_type_ids

        actual_type_label = rows[0][3] if rows else "N/A"
        logger.info(
            f"Account '{account_name}' exists={account_exists}, "
            f"type_matches={type_matches} "
            f"(expected='{account_type}', actual='{actual_type_label}')"
        )
        return {
            "account_created": account_exists,
            "type_matches": type_matches,
        }
