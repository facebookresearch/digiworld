# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendNexusPayMoneyScenario(BankingScenario, ComposableScenario):
    """Verify that a Zelle payment was sent to the correct contact."""

    def _get_checks(self, state_path):
        contact_name = getattr(self, "contact_name", None)
        amount = getattr(self, "amount", None)
        memo = getattr(self, "memo", None)
        account_name = getattr(self, "account", None)
        if not contact_name:
            raise ValueError("contact_name parameter is required")
        if amount is None:
            raise ValueError("amount parameter is required")

        amount = float(amount)

        expected_account_id = None
        if account_name:
            acct_query = (
                "SELECT id FROM accounts "
                "WHERE user_id = ? AND LOWER(account_name) LIKE LOWER(?)"
            )
            acct_rows = self._execute_query_in_path(
                acct_query, (self.current_user_id, f"%{account_name}%"),
                state_path,
            )
            if acct_rows:
                expected_account_id = int(acct_rows[0][0])
            else:
                logger.warning(
                    f"Account '{account_name}' not found for user "
                    f"{self.current_user_id}"
                )

        contact_query = (
            "SELECT id FROM zelle_contacts "
            "WHERE user_id = ? AND LOWER(contact_name) = LOWER(?)"
        )
        contact_rows = self._execute_query_in_path(
            contact_query, (self.current_user_id, contact_name), state_path
        )

        if not contact_rows:
            logger.warning(
                f"Zelle contact '{contact_name}' not found at final state"
            )
            return {
                "payment_sent": False,
                "memo_matches": False,
                "from_account_matches": False,
            }

        contact_id = contact_rows[0][0]

        tx_query = (
            "SELECT amount, memo, from_account_id FROM transactions "
            "WHERE user_id = ? AND zelle_contact_id = ? "
            "AND transaction_type_id = 3"
        )
        tx_rows = self._execute_query_in_path(
            tx_query, (self.current_user_id, contact_id), state_path
        )

        payment_found = False
        memo_found = False
        account_matches = account_name is None
        for row in tx_rows:
            tx_amount = float(row[0]) if row[0] is not None else 0.0
            tx_memo = row[1] or ""
            tx_from_account = row[2]
            if abs(tx_amount - amount) < 0.01:
                payment_found = True
                if memo and substring_match(tx_memo, memo):
                    memo_found = True
                elif not memo:
                    memo_found = True
                if expected_account_id is not None and tx_from_account is not None:
                    if int(tx_from_account) == int(expected_account_id):
                        account_matches = True

        logger.info(
            f"Zelle payment of ${amount} to '{contact_name}' "
            f"(contact_id={contact_id}): "
            f"payment={'found' if payment_found else 'not found'}, "
            f"memo={'matches' if memo_found else 'no match'}, "
            f"from_account={'matches' if account_matches else 'no match'}"
        )

        return {
            "payment_sent": payment_found,
            "memo_matches": memo_found,
            "from_account_matches": account_matches,
        }
