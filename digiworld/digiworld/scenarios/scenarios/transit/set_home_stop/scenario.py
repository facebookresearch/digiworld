# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetHomeStopScenario(TransitScenario, ComposableScenario):
    """Verify that the user's home stop has been set to the specified stop."""

    def _get_checks(self, state_path):
        query = (
            "SELECT s.name FROM user_preferences up "
            "JOIN stops s ON up.home_stop_id = s.id "
            "WHERE up.user_id = ?"
        )
        rows = self._execute_query_in_path(query, (1,), state_path)

        if not rows:
            raise ValueError(
                "No user_preferences record with a valid home_stop_id "
                "found for user_id=1"
            )

        actual_name = rows[0][0]
        matches = actual_name.strip().lower() == self.stop_name.strip().lower()

        logger.info(
            f"Home stop check: expected='{self.stop_name}', "
            f"actual='{actual_name}', matches={matches}"
        )

        return {"home_stop_matches": matches}
