# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class MostRecentContactScenario(PaymentScenario, ComposableScenario):
    """Verify that the agent correctly identifies the most recent contact
    based on transaction history."""

    def _get_checks(self, state_path):
        wallet_query = (
            "SELECT id FROM wallets "
            "WHERE user_id = ? AND status = 'active' "
            "LIMIT 1"
        )
        wallet_rows = self._execute_query_in_path(
            wallet_query, (self.current_user_id,), self.initial_state_path
        )
        if not wallet_rows:
            raise ValueError(
                f"No active wallet found for user {self.current_user_id}"
            )
        wallet_id = wallet_rows[0][0]

        query = (
            "SELECT u.first_name, u.last_name, c.nickname "
            "FROM transactions t "
            "JOIN wallets w ON "
            "  CASE "
            "    WHEN t.sender_wallet_id = ? THEN t.receiver_wallet_id "
            "    ELSE t.sender_wallet_id "
            "  END = w.id "
            "JOIN users u ON w.user_id = u.id "
            "LEFT JOIN contacts c ON c.user_id = ? AND c.contact_user_id = u.id "
            "WHERE (t.sender_wallet_id = ? OR t.receiver_wallet_id = ?) "
            "  AND t.type = 'transfer' "
            "  AND t.status = 'completed' "
            "ORDER BY t.created_at DESC "
            "LIMIT 1"
        )
        rows = self._execute_query_in_path(
            query,
            (wallet_id, self.current_user_id, wallet_id, wallet_id),
            self.initial_state_path,
        )

        if not rows:
            raise ValueError(
                f"No completed transactions found for user {self.current_user_id}"
            )

        first_name, last_name, nickname = rows[0]
        full_name = f"{first_name} {last_name}"

        candidates = [c for c in (nickname, first_name, last_name, full_name) if c]
        matched = any(
            substring_match(self.agent_answer, candidate)
            for candidate in candidates
        )

        logger.info(
            f"Expected contact: {full_name} (nickname={nickname!r}), "
            f"agent answer: {self.agent_answer!r}, matched: {matched}"
        )
        return {"answer_matches": matched}
