# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import TargetStateScenario
from digiworld.scenarios.scenarios.auction.base_scenario import AuctionScenario


class ChangeProfilePasswordScenario(AuctionScenario, TargetStateScenario):
    """Scenario for changing the user's profile password."""

    def _check_task_completion(self, state_path):
        target_password = str(self.password2)

        # Check DB first (plaintext comparison)
        query = "SELECT password FROM users WHERE id = ?"
        results = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        if not results:
            raise ValueError(
                f"No user found with id {self.current_user_id} in final state"
            )

        db_password = str(results[0][0])
        if db_password == target_password:
            return True

        # The initial password must have changed even if we can't match the
        # exact target (e.g. the app hashes before storing).
        initial_results = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        initial_password = str(initial_results[0][0]) if initial_results else None
        if initial_password is not None and db_password != initial_password:
            return True

        # Also check rootstore in case the app persists there instead of DB
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if os.path.exists(rootstore_path):
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)
            user_store = rootstore.get("userStore", {})
            rs_password = user_store.get("password") or user_store.get("user", {}).get("password")
            if rs_password and str(rs_password) == target_password:
                return True

        return False
