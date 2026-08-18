# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
import json
import os


class DeleteSavedRouteScenario(TransitScenario, TargetStateScenario):
    """Scenario for deleting a specific saved transit route."""
    
    def _check_task_completion(self, state_path):
        """
        Check if the specified saved route has been deleted.

        First verifies the route exists in the initial state (injected via
        mockdata), then checks it no longer exists in the current state.
        """
        query = "SELECT COUNT(*) FROM saved_routes WHERE name LIKE ?"

        # Precondition: route must exist in the initial state.
        # Without this check, profiles where the route was never injected
        # would appear "trivially completed" (count=0 → deleted).
        initial = self._execute_query_in_path(
            query, (f"%{self.route_name}%",), self.initial_state_path
        )
        if not initial or initial[0][0] == 0:
            raise ValueError(
                f"No saved routes found for user with route name '{self.route_name}'"
            )

        # Check that the route no longer exists in the current state
        results = self._execute_query_in_path(
            query, (f"%{self.route_name}%",), state_path
        )
        return results and results[0][0] == 0
