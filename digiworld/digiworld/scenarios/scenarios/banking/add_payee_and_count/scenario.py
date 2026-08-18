# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddPayeeAndCountScenario(BankingScenario, ComposableScenario):
    """Composed scenario: add a new payee, then report how many payees
    exist in the same category.

    Combines verification logic from ``add_new_payee`` (action) and
    ``count_payees_in_category`` (info-retrieval).  The expected count
    is the initial count in the category plus one (the newly added payee).
    """

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
        category = getattr(self, "category", None)
        if not payee_name:
            raise ValueError("payee_name parameter is required")
        if not category:
            raise ValueError("category parameter is required")

        # -- Payee creation verification (from add_new_payee) ---------------

        initial_count = self._count_matching_billers(
            payee_name, self.initial_state_path
        )
        final_count = self._count_matching_billers(payee_name, state_path)
        payee_created = final_count > initial_count

        category_matches = True
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

        # -- Count verification (from count_payees_in_category) -------------
        # Expected count = initial active payees in category + 1

        count_query = (
            "SELECT COUNT(*) FROM billers "
            "WHERE LOWER(category) = LOWER(?) AND is_active = 1"
        )
        initial_cat_rows = self._execute_query_in_path(
            count_query, (category,), self.initial_state_path
        )
        initial_cat_total = initial_cat_rows[0][0] if initial_cat_rows else 0
        expected_count = initial_cat_total + 1

        answer_ok = numeric_match(self.agent_answer, expected_count)

        logger.info(
            "Add payee & count: payee='%s', category='%s', "
            "created=%s, category_matches=%s, phone_matches=%s, "
            "initial_cat_total=%d, expected_count=%d, "
            "agent_answer=%r, answer_ok=%s",
            payee_name, category,
            payee_created, category_matches, phone_matches,
            initial_cat_total, expected_count,
            self.agent_answer, answer_ok,
        )

        return {
            "payee_created": payee_created,
            "category_matches": category_matches,
            "phone_matches": phone_matches,
            "answer_matches_count": answer_ok,
        }
