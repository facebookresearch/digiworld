# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario


class ChangePasswordScenario(ParkingScenario, ComposableScenario):
    """Scenario for changing the current user's account password."""

    def _get_checks(self, state_path):
        query = "SELECT password FROM users WHERE id = ?"
        results = self._execute_query_in_path(query, (self.current_user_id,), state_path)
        if not results:
            raise ValueError(f"User {self.current_user_id} not found in database")
        current_password = results[0][0] or ""
        return {
            "password_updated": current_password == self.new_password,
        }
