# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class PayPendingBillScenario(BankingScenario, ComposableScenario):
    """Verify that the correct pending bill (most/least expensive) was paid."""

    def _get_checks(self, state_path):
        selection_criteria = getattr(self, "selection_criteria", None)
        if not selection_criteria:
            raise ValueError("selection_criteria parameter is required")

        criteria_lower = selection_criteria.lower()

        pending_query = (
            "SELECT id, amount FROM bills "
            "WHERE user_id = ? AND status = 'pending' "
            "ORDER BY amount DESC"
        )
        pending_rows = self._execute_query_in_path(
            pending_query, (self.current_user_id,), self.initial_state_path
        )

        if not pending_rows:
            raise ValueError("No pending bills found in initial state")

        if "most expensive" in criteria_lower:
            target_bill_id = pending_rows[0][0]
            target_amount = pending_rows[0][1]
        elif "least expensive" in criteria_lower:
            target_bill_id = pending_rows[-1][0]
            target_amount = pending_rows[-1][1]
        else:
            raise ValueError(
                f"Unknown selection_criteria: {selection_criteria}. "
                f"Expected 'most expensive' or 'least expensive'."
            )

        bill_check_query = (
            "SELECT status FROM bills WHERE id = ?"
        )
        final_rows = self._execute_query_in_path(
            bill_check_query, (target_bill_id,), state_path
        )

        if not final_rows:
            raise ValueError(f"Bill {target_bill_id} not found in final state")

        final_status = (final_rows[0][0] or "").lower()
        bill_paid = final_status == "paid"

        logger.info(
            f"Pay pending bill check: criteria='{selection_criteria}', "
            f"target_bill_id={target_bill_id}, target_amount={target_amount}, "
            f"final_status={final_status}, bill_paid={bill_paid}"
        )

        return {
            "correct_bill_paid": bill_paid,
        }
