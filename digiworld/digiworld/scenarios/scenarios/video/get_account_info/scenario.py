# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.video.base_scenario import VideoScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

FIELD_TO_KEY = {
    "name": "username",
    "account name": "username",
    "email": "email",
}


class GetAccountInfoScenario(VideoScenario, ComposableScenario):
    """Verify that the agent correctly reports the user's account info."""

    def _get_checks(self, state_path):
        expected = self._get_expected_value()
        logger.info(
            f"Expected value for '{self.field}': {expected!r}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": substring_match(self.agent_answer, expected),
        }

    def _get_expected_value(self) -> str:
        rootstore_path = os.path.join(self.initial_state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            raise ValueError(
                f"rootstore.json not found at {rootstore_path}"
            )

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        user = rootstore.get("userStore", {}).get("user")
        if not user:
            raise ValueError("userStore.user not found in rootstore")

        key = FIELD_TO_KEY.get(self.field.lower())
        if key is None:
            raise ValueError(
                f"Unknown field {self.field!r}. "
                f"Supported: {list(FIELD_TO_KEY.keys())}"
            )

        value = user.get(key)
        if not value:
            raise ValueError(
                f"Field '{key}' is empty or missing in userStore.user"
            )
        return str(value)
