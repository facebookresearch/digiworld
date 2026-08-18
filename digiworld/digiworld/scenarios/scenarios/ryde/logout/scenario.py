# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os

from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario


class LogoutScenario(RydeScenario, ComposableScenario):
    """Verify the user has logged out of the Ryde app."""

    def _get_checks(self, state_path):
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, 'r') as f:
            rootstore = json.load(f)

        user_store = rootstore.get('userStore', {})
        current_user = user_store.get('currentUser')
        auth_token = user_store.get('authToken')

        logged_out = (current_user is None) and (not auth_token)
        return {"user_logged_out": logged_out}
