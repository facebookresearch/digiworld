# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

_OUTGOING_CATEGORIES = ("debit", "transfer")


class LastTransactionRecipientScenario(BankingScenario, ComposableScenario):
    """Verify that the agent correctly reports the recipient of the user's last outgoing transaction."""

    def _get_checks(self, state_path):
        placeholders = ",".join("?" * len(_OUTGOING_CATEGORIES))
        query = (
            "SELECT t.biller_id, t.zelle_contact_id, t.beneficiary_id, "
            "t.to_account_id, t.description "
            "FROM transactions t "
            "JOIN transaction_types tt ON t.transaction_type_id = tt.id "
            "WHERE t.user_id = ? AND t.status = 'success' "
            f"AND tt.category IN ({placeholders}) "
            "ORDER BY t.transaction_date DESC, t.id DESC LIMIT 1"
        )
        params = (self.current_user_id, *_OUTGOING_CATEGORIES)
        rows = self._execute_query_in_path(
            query, params, self.initial_state_path
        )

        if not rows:
            logger.warning(
                "No outgoing successful transactions found for user %s "
                "— scenario is infeasible on this profile",
                self.current_user_id,
            )
            return {"answer_matches": False}

        biller_id, zelle_id, beneficiary_id, to_account_id, description = rows[0]
        expected_recipient = None

        if biller_id:
            biller_rows = self._execute_query_in_path(
                "SELECT name FROM billers WHERE id = ?",
                (biller_id,), self.initial_state_path,
            )
            if biller_rows:
                expected_recipient = biller_rows[0][0]

        if not expected_recipient and zelle_id:
            zelle_rows = self._execute_query_in_path(
                "SELECT contact_name FROM zelle_contacts WHERE id = ?",
                (zelle_id,), self.initial_state_path,
            )
            if zelle_rows:
                expected_recipient = zelle_rows[0][0]

        if not expected_recipient and beneficiary_id:
            ben_rows = self._execute_query_in_path(
                "SELECT name FROM beneficiaries WHERE id = ?",
                (beneficiary_id,), self.initial_state_path,
            )
            if ben_rows:
                expected_recipient = ben_rows[0][0]

        if not expected_recipient and to_account_id:
            acct_rows = self._execute_query_in_path(
                "SELECT account_name FROM accounts WHERE id = ?",
                (to_account_id,), self.initial_state_path,
            )
            if acct_rows and acct_rows[0][0]:
                expected_recipient = acct_rows[0][0]

        if not expected_recipient:
            if description:
                expected_recipient = description
            else:
                raise ValueError(
                    f"Could not determine recipient for last transaction "
                    f"of user {self.current_user_id}"
                )

        logger.info(
            f"Expected recipient: {expected_recipient!r}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": substring_match(self.agent_answer, expected_recipient)}
