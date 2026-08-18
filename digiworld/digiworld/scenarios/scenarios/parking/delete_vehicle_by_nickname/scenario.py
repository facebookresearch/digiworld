# Copyright (c) Meta Platforms, Inc. and affiliates.
from typing import Dict

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.parking.base_scenario import ParkingScenario


class DeleteVehicleByNicknameScenario(ParkingScenario, ComposableScenario):
    """Scenario for deleting a vehicle by its nickname."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = "SELECT id FROM vehicles WHERE LOWER(nickname) = LOWER(?) AND user_id = ?"
        # Check vehicle exists in the initial state (precondition)
        initial_results = self._execute_query_in_path(
            query, (self.nickname, self.current_user_id), self.initial_state_path
        )
        # Check vehicle is gone in the final state
        results = self._execute_query_in_path(
            query, (self.nickname, self.current_user_id), state_path
        )
        return {
            "vehicle_existed_initially": len(initial_results) > 0,
            "vehicle_deleted": len(results) == 0,
        }
