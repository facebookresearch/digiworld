# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario

logger = logging.getLogger(__name__)


class DepositToAccountScenario(PaymentScenario, ComposableScenario):
    """Verify a deposit transaction was created for the specified amount."""

    def _get_checks(self, state_path):
        raw = getattr(self, "amount", None)
        if raw is None:
            raise ValueError("amount parameter is required")

        target_amount = float(str(raw).replace("$", "").replace(",", ""))

        query = """
            SELECT t.id, t.amount, t.status, t.type
            FROM transactions t
            JOIN wallets w ON t.receiver_wallet_id = w.id
            WHERE w.user_id = ?
              AND t.type = 'deposit'
              AND t.amount = ?
              AND t.status = 'completed'
            ORDER BY t.created_at DESC
        """
        params = (self.current_user_id, target_amount)

        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, params
        )

        created = len(new_records) > 0
        logger.info(
            f"Deposit of ${target_amount}: "
            f"{'found' if created else 'not found'}"
        )

        return {"deposit_created": created}
