# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario


class ChangeNameScenario(ParkingScenario, ComposableScenario):
    """Scenario for changing the current user's display name."""

    def _get_checks(self, state_path):
        query = "SELECT full_name FROM users WHERE id = ?"
        results = self._execute_query_in_path(query, (self.current_user_id,), state_path)
        if not results:
            raise ValueError(f"User {self.current_user_id} not found in database")
        current_name = results[0][0] or ""
        return {
            "name_updated": current_name.strip().lower() == self.name.strip().lower(),
        }
