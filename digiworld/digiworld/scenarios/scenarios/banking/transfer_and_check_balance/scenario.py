import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class TransferAndCheckBalanceScenario(BankingScenario, ComposableScenario):
    """Composed scenario: transfer between accounts, then report the
    destination account's resulting available balance.

    Combines the verification logic of ``transfer_between_accounts``
    (action) and ``check_account_balance`` (info-retrieval).  The agent
    must both execute the transfer *and* correctly report the post-transfer
    balance, which requires reasoning about the state change.
    """

    def _get_checks(self, state_path):
        amount_str = getattr(self, "amount", None)
        account_1 = getattr(self, "account_1", None)
        account_2 = getattr(self, "account_2", None)
        if not amount_str:
            raise ValueError("amount parameter is required")
        if not account_1:
            raise ValueError("account_1 parameter is required")
        if not account_2:
            raise ValueError("account_2 parameter is required")

        amount = float(str(amount_str).replace("$", "").replace(",", ""))

        # -- Transfer verification (from transfer_between_accounts) ----------

        acct_query = (
            "SELECT id, balance, available_balance FROM accounts "
            "WHERE user_id = ? AND account_name = ? AND status = 'active'"
        )
        from_rows = self._execute_query_in_path(
            acct_query, (self.current_user_id, account_1), state_path
        )
        to_rows = self._execute_query_in_path(
            acct_query, (self.current_user_id, account_2), state_path
        )

        if not from_rows:
            raise ValueError(f"Source account '{account_1}' not found")
        if not to_rows:
            raise ValueError(f"Destination account '{account_2}' not found")

        from_id = from_rows[0][0]
        to_id = to_rows[0][0]

        tx_query = (
            "SELECT t.amount FROM transactions t "
            "JOIN transaction_types tt ON t.transaction_type_id = tt.id "
            "WHERE t.user_id = ? AND t.from_account_id = ? "
            "AND t.to_account_id = ? "
            "AND LOWER(tt.code) IN ('transfer', 'internal_transfer', 'account_transfer')"
        )
        tx_rows = self._execute_query_in_path(
            tx_query, (self.current_user_id, from_id, to_id), state_path
        )

        transfer_found = any(
            abs(row[0] - amount) < 0.01 for row in tx_rows
        )

        initial_from = self._execute_query_in_path(
            "SELECT balance FROM accounts WHERE id = ?",
            (from_id,), self.initial_state_path,
        )
        initial_to = self._execute_query_in_path(
            "SELECT balance FROM accounts WHERE id = ?",
            (to_id,), self.initial_state_path,
        )

        balance_correct = True
        if initial_from and from_rows:
            expected_from = initial_from[0][0] - amount
            balance_correct = balance_correct and abs(
                from_rows[0][1] - expected_from
            ) < 0.01
        if initial_to and to_rows:
            expected_to = initial_to[0][0] + amount
            balance_correct = balance_correct and abs(
                to_rows[0][1] - expected_to
            ) < 0.01

        # -- Balance answer verification (from check_account_balance) --------

        initial_available = self._execute_query_in_path(
            "SELECT available_balance FROM accounts "
            "WHERE user_id = ? AND account_name = ? AND status = 'active'",
            (self.current_user_id, account_2),
            self.initial_state_path,
        )

        if not initial_available:
            raise ValueError(
                f"No active account '{account_2}' found for user "
                f"{self.current_user_id} in initial state"
            )

        expected_balance = initial_available[0][0] + amount
        answer_ok = float_match(self.agent_answer, expected_balance)

        logger.info(
            "Transfer $%.2f %s -> %s: transfer_found=%s, balance_correct=%s | "
            "Expected post-transfer balance=%.2f, agent_answer=%r, match=%s",
            amount, account_1, account_2,
            transfer_found, balance_correct,
            expected_balance, self.agent_answer, answer_ok,
        )

        return {
            "transfer_recorded": transfer_found,
            "balances_updated": balance_correct,
            "balance_answer_correct": answer_ok,
        }
