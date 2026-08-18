import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_CARD_INFO_QUERIES = {
    "active": (
        "SELECT apr, annual_fee, late_payment_fee, cash_advance_fee_percent, "
        "minimum_payment_percent "
        "FROM credit_cards "
        "WHERE user_id = ? AND status = 'active' "
        "ORDER BY id DESC LIMIT 1"
    ),
    "fallback": (
        "SELECT apr, annual_fee, late_payment_fee, cash_advance_fee_percent, "
        "minimum_payment_percent "
        "FROM credit_cards "
        "WHERE user_id = ? "
        "ORDER BY id DESC LIMIT 1"
    ),
}

_CARD_INFO_FIELDS = {
    "apr": {"index": 0, "label": "APR"},
    "annual fee": {"index": 1, "label": "annual fee"},
    "late payment fee": {"index": 2, "label": "late payment fee"},
    "cash advance fee": {"index": 3, "label": "cash advance fee"},
    "minimum payment": {"index": 4, "label": "minimum payment"},
}


class PayBillAndCheckCardInfoScenario(BankingScenario, ComposableScenario):
    """Composed scenario: pay a bill using the credit card, then report
    a specific credit card info field.

    Combines verification logic from ``pay_bill_with_credit_card`` (action)
    and ``credit_card_info_query`` (info-retrieval).  The agent must both
    execute the credit card bill payment *and* correctly report the
    requested card info.
    """

    def _get_checks(self, state_path):
        payee = getattr(self, "payee", None)
        info_type = getattr(self, "info_type", None)
        if not payee:
            raise ValueError("payee parameter is required")
        if not info_type:
            raise ValueError("info_type parameter is required")

        # -- Bill payment verification (from pay_bill_with_credit_card) --------

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

        payment_executed = tx_found or bill_paid

        # -- Credit card info verification (from credit_card_info_query) -------

        info_key = info_type.lower().strip()

        field = _CARD_INFO_FIELDS.get(info_key)
        if not field:
            known = ", ".join(_CARD_INFO_FIELDS.keys())
            raise ValueError(
                f"Unknown info_type '{info_type}'. Known types: {known}"
            )

        rows = self._execute_query_in_path(
            _CARD_INFO_QUERIES["active"],
            (self.current_user_id,),
            state_path,
        )
        if not rows:
            rows = self._execute_query_in_path(
                _CARD_INFO_QUERIES["fallback"],
                (self.current_user_id,),
                state_path,
            )
        if not rows:
            raise ValueError(
                f"No credit card found for current_user_id={self.current_user_id}"
            )

        expected_value = float(rows[0][field["index"]])
        answer_ok = float_match(self.agent_answer, expected_value)

        logger.info(
            "Pay bill & check card info: payee='%s', payment_executed=%s, "
            "info_type='%s', expected=%r, agent_answer=%r, answer_ok=%s",
            payee, payment_executed,
            info_type, expected_value, self.agent_answer, answer_ok,
        )

        return {
            "payment_executed": payment_executed,
            "card_info_answer_correct": answer_ok,
        }
