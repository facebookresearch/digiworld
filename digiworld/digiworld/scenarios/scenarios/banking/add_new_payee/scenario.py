# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddNewPayeeScenario(BankingScenario, ComposableScenario):
    """Verify that a new payee was added to the billers table."""

    def _count_matching_billers(self, payee_name, state_path):
        query = (
            "SELECT COUNT(*) FROM billers "
            "WHERE LOWER(name) LIKE LOWER(?)"
        )
        rows = self._execute_query_in_path(
            query, (f"%{payee_name}%",), state_path
        )
        return rows[0][0] if rows else 0

    def _get_checks(self, state_path):
        payee_name = getattr(self, "payee_name", None)
        if not payee_name:
            raise ValueError("payee_name parameter is required")

        initial_count = self._count_matching_billers(
            payee_name, self.initial_state_path
        )
        final_count = self._count_matching_billers(payee_name, state_path)
        payee_created = final_count > initial_count

        logger.info(
            f"Checking payee '{payee_name}': initial_count={initial_count}, "
            f"final_count={final_count}, created={payee_created}"
        )

        category = getattr(self, "category", None)
        category_matches = True
        if category:
            cat_query = (
                "SELECT COUNT(*) FROM billers "
                "WHERE LOWER(name) LIKE LOWER(?) AND LOWER(category) = LOWER(?)"
            )
            cat_rows = self._execute_query_in_path(
                cat_query, (f"%{payee_name}%", category), state_path
            )
            cat_count = cat_rows[0][0] if cat_rows else 0
            cat_initial_query_rows = self._execute_query_in_path(
                cat_query, (f"%{payee_name}%", category), self.initial_state_path
            )
            cat_initial_count = cat_initial_query_rows[0][0] if cat_initial_query_rows else 0
            category_matches = cat_count > cat_initial_count
            logger.info(
                f"Category '{category}' check: initial={cat_initial_count}, "
                f"final={cat_count}, matches={category_matches}"
            )

        phone = getattr(self, "phone", None)
        phone_matches = True
        if phone:
            phone_query = (
                "SELECT COUNT(*) FROM billers "
                "WHERE LOWER(name) LIKE LOWER(?) AND phone = ?"
            )
            phone_rows = self._execute_query_in_path(
                phone_query, (f"%{payee_name}%", phone), state_path
            )
            phone_count = phone_rows[0][0] if phone_rows else 0
            phone_matches = phone_count > 0
            logger.info(
                f"Phone '{phone}' check: found={phone_count}, matches={phone_matches}"
            )

        return {
            "payee_created": payee_created,
            "category_matches": category_matches,
            "phone_matches": phone_matches,
        }
