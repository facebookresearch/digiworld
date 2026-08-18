"""Composed scenario: change display name then change password."""

import logging
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario

logger = logging.getLogger(__name__)


class ChangeNameAndPasswordScenario(ParkingScenario, ComposableScenario):
    """Verify that the agent changed both the user's name and password.

    Combines change_name (full_name updated in users table)
    + change_password (password updated in users table).
    Both changes are verifiable in the final DB state.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = "SELECT full_name, password FROM users WHERE id = ?"
        results = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        if not results:
            raise ValueError(f"User {self.current_user_id} not found in database")

        current_name = results[0][0] or ""
        current_password = results[0][1] or ""

        name_updated = current_name.strip().lower() == self.name.strip().lower()
        password_updated = current_password == self.new_password

        logger.info(
            "Name check: expected=%r, actual=%r, matches=%s; "
            "Password check: matches=%s",
            self.name, current_name, name_updated, password_updated,
        )

        return {
            "name_updated": name_updated,
            "password_updated": password_updated,
        }
