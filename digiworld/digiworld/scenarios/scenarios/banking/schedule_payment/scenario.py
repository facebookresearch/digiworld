# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SchedulePaymentScenario(BankingScenario, ComposableScenario):
    """Verify that a payment was scheduled to the correct payee."""

    def _get_checks(self, state_path):
        payee = getattr(self, "payee", None)
        amount = getattr(self, "amount", None)
        scheduled_date = getattr(self, "date", None)
        note = getattr(self, "note", None)
        if not payee:
            raise ValueError("payee parameter is required")
        if amount is None:
            raise ValueError("amount parameter is required")

        expected_amount = float(amount)

        biller_rows = self._execute_query_in_path(
            "SELECT id FROM billers WHERE LOWER(name) = LOWER(?)",
            (payee,),
            state_path,
        )
        if not biller_rows:
            biller_rows = self._execute_query_in_path(
                "SELECT id FROM billers WHERE LOWER(name) LIKE ?",
                (f"%{payee.lower()}%",),
                state_path,
            )

        if not biller_rows:
            logger.info("No biller found matching '%s'", payee)
            return {
                "scheduled_transaction_exists": False,
                "amount_matches": False,
                "date_matches": scheduled_date is None,
                "memo_matches": note is None,
            }

        biller_ids = [row[0] for row in biller_rows]
        placeholders = ",".join("?" for _ in biller_ids)
        query = (
            "SELECT st.amount, st.scheduled_date, st.memo, st.biller_id "
            "FROM scheduled_transactions st "
            "WHERE st.user_id = ? AND st.status = 'scheduled' "
            f"AND st.biller_id IN ({placeholders})"
        )
        rows = self._execute_query_in_path(
            query, tuple([self.current_user_id] + biller_ids), state_path
        )

        if not rows:
            logger.info("No scheduled transactions found for biller")
            return {
                "scheduled_transaction_exists": False,
                "amount_matches": False,
                "date_matches": scheduled_date is None,
                "memo_matches": note is None,
            }

        amount_ok = False
        date_ok = scheduled_date is None
        memo_ok = note is None

        for row_amount, row_date, row_memo, _biller_id in rows:
            if abs(float(row_amount) - expected_amount) < 0.01:
                amount_ok = True
            if scheduled_date and row_date:
                date_ok = row_date.startswith(scheduled_date)
            if note:
                memo_ok = note.lower() in (row_memo or "").lower()
            if amount_ok:
                break

        logger.info(
            "Schedule payment check: payee='%s', biller_ids=%s, "
            "expected_amount=%s, amount_ok=%s, date_ok=%s, memo_ok=%s",
            payee,
            biller_ids,
            expected_amount,
            amount_ok,
            date_ok,
            memo_ok,
        )

        return {
            "scheduled_transaction_exists": True,
            "amount_matches": amount_ok,
            "date_matches": date_ok,
            "memo_matches": memo_ok,
        }
