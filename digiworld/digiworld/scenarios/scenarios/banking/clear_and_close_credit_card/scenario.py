# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ClearAndCloseCreditCardScenario(BankingScenario, ComposableScenario):
    """Verify that the credit card balance was cleared and the card was closed."""

    def _get_checks(self, state_path):
        last4 = getattr(self, "last4", None)
        if not last4:
            raise ValueError("last4 parameter is required")

        query = (
            "SELECT current_balance, status FROM credit_cards "
            "WHERE user_id = ? AND last_four_digits = ?"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, str(last4)), state_path
        )

        if not rows:
            raise ValueError(
                f"No credit card found ending in {last4} for user {self.current_user_id}"
            )

        balance = float(rows[0][0])
        status = (rows[0][1] or "").lower()

        balance_cleared = abs(balance) < 0.01
        card_closed = status in ("closed", "inactive")

        initial_card_query = (
            "SELECT current_balance FROM credit_cards "
            "WHERE user_id = ? AND last_four_digits = ?"
        )
        initial_rows = self._execute_query_in_path(
            initial_card_query, (self.current_user_id, str(last4)),
            self.initial_state_path
        )
        initial_balance = float(initial_rows[0][0]) if initial_rows else 0.0
        had_balance = initial_balance > 0.01

        payment_made = True
        if had_balance:
            payment_query = (
                "SELECT t.id FROM transactions t "
                "JOIN credit_cards cc ON t.credit_card_id = cc.id "
                "WHERE t.user_id = ? AND t.transaction_type_id = 8 "
                "AND cc.last_four_digits = ?"
            )
            payment_rows = self._execute_query_in_path(
                payment_query, (self.current_user_id, str(last4)), state_path
            )
            payment_made = bool(payment_rows)

        logger.info(
            f"Clear & close check: last4={last4}, balance={balance}, "
            f"status={status}, balance_cleared={balance_cleared}, "
            f"card_closed={card_closed}, payment_made={payment_made}"
        )

        return {
            "balance_cleared": balance_cleared,
            "card_closed": card_closed,
            "payment_made": payment_made,
        }
