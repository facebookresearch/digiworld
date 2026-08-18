# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class PayPayeeScenario(BankingScenario, ComposableScenario):
    """Verify that a bill payment transaction was created for the payee."""

    def _get_checks(self, state_path):
        payee_name = getattr(self, "payee_name", None)
        amount = getattr(self, "amount", None)
        if not payee_name:
            raise ValueError("payee_name parameter is required")
        if amount is None:
            raise ValueError("amount parameter is required")

        amount = float(amount)

        biller_query = (
            "SELECT id FROM billers WHERE LOWER(name) LIKE LOWER(?)"
        )
        biller_rows = self._execute_query_in_path(
            biller_query, (f"%{payee_name}%",), state_path
        )

        if not biller_rows:
            logger.warning(f"Biller '{payee_name}' not found in final state")
            return {"payment_recorded": False}

        biller_id = biller_rows[0][0]

        tx_query = (
            "SELECT t.amount FROM transactions t "
            "JOIN transaction_types tt ON t.transaction_type_id = tt.id "
            "WHERE t.user_id = ? AND t.biller_id = ? "
            "AND tt.code = 'bill_payment'"
        )
        tx_rows = self._execute_query_in_path(
            tx_query, (self.current_user_id, biller_id), state_path
        )

        payment_found = any(
            abs(float(row[0]) - amount) < 0.01 for row in tx_rows
        )

        if not payment_found:
            bill_query = (
                "SELECT paid_amount FROM bills "
                "WHERE user_id = ? AND biller_id = ? AND status = 'paid'"
            )
            bill_rows = self._execute_query_in_path(
                bill_query, (self.current_user_id, biller_id), state_path
            )
            payment_found = any(
                row[0] is not None and abs(float(row[0]) - amount) < 0.01
                for row in bill_rows
            )

        logger.info(
            f"Payment of ${amount} to '{payee_name}' (biller_id={biller_id}): "
            f"{'found' if payment_found else 'not found'}"
        )
        return {"payment_recorded": payment_found}
