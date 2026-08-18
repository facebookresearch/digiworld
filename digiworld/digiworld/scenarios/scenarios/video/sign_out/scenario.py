# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SignOutScenario(VideoScenario, ComposableScenario):
    """Verify that the user has been signed out."""

    def _get_checks(self, state_path):
        signed_out = self._check_signed_out(state_path)
        return {
            "signed_out": signed_out,
        }

    def _check_signed_out(self, state_path) -> bool:
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(f"rootstore.json not found at {rootstore_path}")

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        user_store = rootstore.get("userStore", {})
        user = user_store.get("user")
        is_authenticated = user_store.get("isAuthenticated", False)

        result = user is None or not is_authenticated
        logger.info(
            f"Sign-out check: user={user!r}, "
            f"isAuthenticated={is_authenticated}, result={result}"
        )
        return result
