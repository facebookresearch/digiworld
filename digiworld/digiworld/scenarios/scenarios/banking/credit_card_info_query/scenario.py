# Copyright (c) Meta Platforms, Inc. and affiliates.
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


class CreditCardInfoQueryScenario(BankingScenario, ComposableScenario):
    """Verify that the agent correctly reports actual credit card info."""

    def _get_latest_card_info(self, state_path):
        if not hasattr(self, "current_user_id") or self.current_user_id is None:
            raise ValueError("current_user_id is required to verify credit card info")

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
        return rows[0]

    def _get_checks(self, state_path):
        info_type = getattr(self, "info_type", None)
        if not info_type:
            raise ValueError("info_type parameter is required")

        info_key = info_type.lower().strip()

        field = _CARD_INFO_FIELDS.get(info_key)
        if not field:
            known = ", ".join(_CARD_INFO_FIELDS.keys())
            raise ValueError(
                f"Unknown info_type '{info_type}'. Known types: {known}"
            )

        card_info = self._get_latest_card_info(state_path)
        expected_value = float(card_info[field["index"]])

        logger.info(
            f"Checking credit card info_type={info_type!r}, "
            f"expected={expected_value!r}, agent answer: {self.agent_answer!r}"
        )

        return {"answer_matches": float_match(self.agent_answer, expected_value)}
