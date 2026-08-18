# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SchedulePaymentWithCreditCardScenario(BankingScenario, ComposableScenario):
    """Verify that a scheduled payment was created for the average bill amount
    using the credit card."""

    def _get_checks(self, state_path):
        payee = getattr(self, "payee", None)
        if not payee:
            raise ValueError("payee parameter is required")

        note = getattr(self, "note", None)
        amount_str = getattr(self, "amount", None)
        payee_lower = payee.lower()

        biller_query = "SELECT id FROM billers WHERE LOWER(name) LIKE ?"
        biller_rows = self._execute_query_in_path(
            biller_query, (f"%{payee_lower}%",), self.initial_state_path
        )
        if not biller_rows:
            raise ValueError(f"No biller found matching payee '{payee}'")
        biller_ids = [r[0] for r in biller_rows]

        placeholders = ",".join("?" for _ in biller_ids)
        bills_query = (
            f"SELECT amount FROM bills "
            f"WHERE user_id = ? AND biller_id IN ({placeholders})"
        )
        bill_rows = self._execute_query_in_path(
            bills_query, (self.current_user_id, *biller_ids), self.initial_state_path
        )

        if not bill_rows:
            raise ValueError(f"No bills found for biller '{payee}'")

        amounts = [float(r[0]) for r in bill_rows]
        derived_avg = round(sum(amounts) / len(amounts), 2)
        expected_avg = (
            float(str(amount_str).replace("$", "").replace(",", ""))
            if amount_str
            else derived_avg
        )

        sched_query = (
            f"SELECT amount, description, memo, biller_id FROM scheduled_transactions "
            f"WHERE user_id = ? AND status = 'scheduled'"
        )
        sched_rows = self._execute_query_in_path(
            sched_query, (self.current_user_id,), state_path
        )

        scheduled_found = False
        amount_matches = False
        memo_matches = not note
        for row_amount, row_desc, row_memo, row_biller_id in sched_rows or []:
            desc_lower = (row_desc or "").lower()
            if row_biller_id in biller_ids or payee_lower in desc_lower:
                scheduled_found = True
                if abs(float(row_amount) - expected_avg) < 0.02:
                    amount_matches = True
                if note and note.lower() in (row_memo or "").lower():
                    memo_matches = True
                if amount_matches and memo_matches:
                    break

        cc_query = (
            "SELECT id FROM credit_cards "
            "WHERE user_id = ? AND status = 'active'"
        )
        cc_rows = self._execute_query_in_path(
            cc_query, (self.current_user_id,), state_path
        )
        credit_card_available = bool(cc_rows)

        logger.info(
            f"Schedule with CC check: payee='{payee}', expected_avg={expected_avg}, "
            f"found={scheduled_found}, amount_ok={amount_matches}, "
            f"memo_ok={memo_matches}, cc_available={credit_card_available}"
        )

        return {
            "scheduled_payment_exists": scheduled_found,
            "average_amount_matches": amount_matches,
            "credit_card_available": credit_card_available,
            "memo_matches": memo_matches,
        }
