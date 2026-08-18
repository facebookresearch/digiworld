# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import float_match, substring_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

FIELD_TO_COLUMNS = {
    "last four digits": "last_four_digits",
    "expiration date": "expiry_month,expiry_year",
    "cvv": "cvv",
    "total credit limit": "credit_limit",
    "available credit": "available_credit",
}


class ApplyCreditCardScenario(BankingScenario, ComposableScenario):
    """Verify that a credit card was applied for and the agent reported the correct info."""

    def _get_checks(self, state_path):
        info_field = getattr(self, "info_field", None)
        if not info_field:
            raise ValueError("info_field parameter is required")

        initial_query = (
            "SELECT COUNT(*) FROM credit_cards WHERE user_id = ?"
        )
        initial_rows = self._execute_query_in_path(
            initial_query, (self.current_user_id,), self.initial_state_path
        )
        initial_count = initial_rows[0][0] if initial_rows else 0

        final_rows = self._execute_query_in_path(
            initial_query, (self.current_user_id,), state_path
        )
        final_count = final_rows[0][0] if final_rows else 0

        card_created = final_count > initial_count

        # Also check rootstore for a pending/completed application state
        # in case the DB hasn't been updated yet (async flow).
        if not card_created:
            import os
            rootstore_path = os.path.join(state_path, "rootstore.json")
            if os.path.exists(rootstore_path):
                import json as _json
                with open(rootstore_path, "r") as f:
                    rs = _json.load(f)
                banking = rs.get("bankingStore", {})
                cc_list = banking.get("creditCards", [])
                if len(cc_list) > initial_count:
                    card_created = True

        logger.info(
            "Credit card creation check: initial=%d, final_db=%d, created=%s",
            initial_count, final_count, card_created,
        )

        if not card_created:
            return {
                "card_created": False,
                "answer_matches": False,
            }

        new_card_query = (
            "SELECT id, last_four_digits, expiry_month, expiry_year, cvv, "
            "credit_limit, available_credit "
            "FROM credit_cards WHERE user_id = ? "
            "ORDER BY id DESC LIMIT 1"
        )
        card_rows = self._execute_query_in_path(
            new_card_query, (self.current_user_id,), state_path
        )
        if not card_rows:
            return {"card_created": False, "answer_matches": False}

        card = card_rows[0]
        field_lower = info_field.lower()
        answer = self.agent_answer

        if field_lower == "last four digits":
            answer_ok = substring_match(answer, str(card[1]))
        elif field_lower == "expiration date":
            month_str = str(card[2]).zfill(2)
            year_str = str(card[3])
            year_short = year_str[-2:]
            answer_ok = (
                substring_match(answer, f"{month_str}/{year_short}")
                or substring_match(answer, f"{month_str}/{year_str}")
                or (substring_match(answer, month_str) and substring_match(answer, year_str))
            )
        elif field_lower == "cvv":
            answer_ok = substring_match(answer, str(card[4]))
        elif field_lower == "total credit limit":
            answer_ok = float_match(answer, float(card[5]))
        elif field_lower == "available credit":
            answer_ok = float_match(answer, float(card[6]))
        else:
            raise ValueError(f"Unknown info_field: {info_field}")

        logger.info(
            f"Info field check: field='{info_field}', answer_ok={answer_ok}, "
            f"agent_answer={answer!r}"
        )

        return {
            "card_created": card_created,
            "answer_matches": answer_ok,
        }
