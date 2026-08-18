import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class OpenAccountAndCheckDepositScenario(BankingScenario, ComposableScenario):
    """Composed scenario: open a new bank account, then report the
    minimum initial deposit required for that account type.

    Combines the verification logic of ``open_new_account`` (action) and
    ``check_initial_deposit`` (info-retrieval).  The agent must both
    create the account *and* correctly report the required deposit.
    """

    def _get_checks(self, state_path):
        account_name = getattr(self, "account_name", None)
        account_type = getattr(self, "account_type", None)
        if not account_name:
            raise ValueError("account_name parameter is required")
        if not account_type:
            raise ValueError("account_type parameter is required")

        # -- Account creation verification (from open_new_account) -------------

        search_term = f"%{account_type.lower()}%"
        type_rows = self._execute_query_in_path(
            "SELECT id FROM account_types "
            "WHERE LOWER(name) LIKE ? OR LOWER(code) LIKE ?",
            (search_term, search_term), state_path,
        )
        expected_type_ids = {r[0] for r in type_rows}

        query = (
            "SELECT a.id, a.account_name, a.account_type_id, at.name "
            "FROM accounts a "
            "JOIN account_types at ON a.account_type_id = at.id "
            "WHERE a.user_id = ? AND a.account_name = ?"
        )
        rows = self._execute_query_in_path(
            query, (self.current_user_id, account_name), state_path
        )

        account_exists = len(rows) > 0

        type_matches = False
        if rows and expected_type_ids:
            type_matches = rows[0][2] in expected_type_ids

        # -- Initial deposit verification (from check_initial_deposit) ---------

        deposit_query = (
            "SELECT min_opening_balance FROM account_types "
            "WHERE LOWER(name) LIKE ? OR LOWER(code) LIKE ?"
        )
        deposit_rows = self._execute_query_in_path(
            deposit_query, (search_term, search_term), self.initial_state_path
        )

        if not deposit_rows:
            raise ValueError(
                f"No account type found matching '{account_type}'"
            )

        expected_deposit = deposit_rows[0][0]
        answer_ok = float_match(self.agent_answer, expected_deposit)

        logger.info(
            "Open account & check deposit: account_name='%s', "
            "account_type='%s', account_exists=%s, type_matches=%s, "
            "expected_deposit=%.2f, agent_answer=%r, answer_ok=%s",
            account_name, account_type, account_exists, type_matches,
            expected_deposit, self.agent_answer, answer_ok,
        )

        return {
            "account_created": account_exists,
            "type_matches": type_matches,
            "deposit_answer_correct": answer_ok,
        }
