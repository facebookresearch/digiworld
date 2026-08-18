# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.banking.base_scenario import BankingScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddNexusPayContactAndPayScenario(BankingScenario, ComposableScenario):
    """Verify that a new Zelle contact was added and a $5 payment was sent."""

    def _get_checks(self, state_path):
        name = getattr(self, "name", None)
        email = getattr(self, "email", None)
        if not name:
            raise ValueError("name parameter is required")
        if not email:
            raise ValueError("email parameter is required")

        contact_query = (
            "SELECT id FROM zelle_contacts "
            "WHERE user_id = ? AND LOWER(contact_name) = LOWER(?) "
            "AND LOWER(contact_email) = LOWER(?)"
        )
        contact_rows = self._execute_query_in_path(
            contact_query, (self.current_user_id, name, email), state_path
        )

        contact_exists = len(contact_rows) > 0
        logger.info(
            f"Contact '{name}' ({email}): "
            f"{'found' if contact_exists else 'not found'}"
        )

        payment_found = False
        if contact_exists:
            contact_id = contact_rows[0][0]
            tx_query = (
                "SELECT amount FROM transactions "
                "WHERE user_id = ? AND zelle_contact_id = ? "
                "AND transaction_type_id = 3"
            )
            tx_rows = self._execute_query_in_path(
                tx_query, (self.current_user_id, contact_id), state_path
            )
            payment_found = any(
                abs(float(row[0]) - 5.0) < 0.01 for row in tx_rows
            )

        logger.info(
            f"$5 payment to '{name}': "
            f"{'found' if payment_found else 'not found'}"
        )

        return {
            "contact_created": contact_exists,
            "payment_sent": payment_found,
        }
