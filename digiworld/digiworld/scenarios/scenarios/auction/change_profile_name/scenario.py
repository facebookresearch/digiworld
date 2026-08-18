# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class ChangeProfileNameScenario(AuctionScenario, TargetStateScenario):
    """Scenario for changing the user's profile name."""

    def _check_task_completion(self, state_path):
        query = "SELECT name FROM users WHERE id = ?"
        results = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        if not results:
            raise ValueError(
                f"No user found with id {self.current_user_id} in final state"
            )

        current_name = str(results[0][0]).lower()
        target_name = str(self.name).lower()
        return current_name == target_name
