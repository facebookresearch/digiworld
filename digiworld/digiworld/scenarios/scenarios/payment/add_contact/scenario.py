# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario

logger = logging.getLogger(__name__)


class AddContactScenario(PaymentScenario, ComposableScenario):
    """Verify that the specified user was added as a contact."""

    def _get_checks(self, state_path):
        contact_name = getattr(self, "contact_name", None)
        if not contact_name:
            raise ValueError("contact_name parameter is required")

        query = """
            SELECT c.id FROM contacts c
            JOIN users u ON c.contact_user_id = u.id
            WHERE c.user_id = ?
              AND (u.first_name || ' ' || u.last_name = ?
                   OR u.first_name = ?
                   OR u.last_name = ?)
        """
        params = (
            self.current_user_id,
            contact_name,
            contact_name,
            contact_name,
        )

        initial_records, current_records, new_records = self.compare_database_records(
            self.initial_state_path, state_path, query, params
        )

        added = len(new_records) > 0
        logger.info(
            f"Contact '{contact_name}': "
            f"{'added' if added else 'not found as new contact'}"
        )

        return {"contact_added": added}
