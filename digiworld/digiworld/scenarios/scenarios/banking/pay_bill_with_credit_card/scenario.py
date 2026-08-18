# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class PayBillWithCreditCardScenario(BankingScenario, ComposableScenario):
    """Verify that a bill was paid to the payee using a credit card."""

    def _get_checks(self, state_path):
        payee = getattr(self, "payee", None)
        if not payee:
            raise ValueError("payee parameter is required")

        payee_lower = payee.lower()

        biller_query = (
            "SELECT id FROM billers WHERE LOWER(name) LIKE ?"
        )
        biller_rows = self._execute_query_in_path(
            biller_query, (f"%{payee_lower}%",), state_path
        )
        biller_ids = [r[0] for r in biller_rows] if biller_rows else []

        tx_found = False
        if biller_ids:
            placeholders = ",".join("?" for _ in biller_ids)
            tx_query = (
                f"SELECT id FROM transactions "
                f"WHERE user_id = ? AND credit_card_id IS NOT NULL "
                f"AND biller_id IN ({placeholders})"
            )
            tx_rows = self._execute_query_in_path(
                tx_query, (self.current_user_id, *biller_ids), state_path
            )
            tx_found = bool(tx_rows)

        bill_paid = False
        if biller_ids:
            placeholders = ",".join("?" for _ in biller_ids)
            bill_query = (
                f"SELECT id FROM bills "
                f"WHERE user_id = ? AND biller_id IN ({placeholders}) "
                f"AND status = 'paid'"
            )
            bill_rows = self._execute_query_in_path(
                bill_query, (self.current_user_id, *biller_ids), state_path
            )
            if bill_rows:
                paid_bill_ids = [r[0] for r in bill_rows]
                bp = ",".join("?" for _ in paid_bill_ids)
                cc_bill_query = (
                    f"SELECT id FROM transactions "
                    f"WHERE user_id = ? AND bill_id IN ({bp}) "
                    f"AND credit_card_id IS NOT NULL"
                )
                cc_bill_rows = self._execute_query_in_path(
                    cc_bill_query,
                    (self.current_user_id, *paid_bill_ids),
                    state_path,
                )
                bill_paid = bool(cc_bill_rows)

        logger.info(
            f"Pay bill with CC check: payee='{payee}', biller_ids={biller_ids}, "
            f"tx_found={tx_found}, bill_paid={bill_paid}"
        )

        return {
            "payment_executed": tx_found or bill_paid,
        }
