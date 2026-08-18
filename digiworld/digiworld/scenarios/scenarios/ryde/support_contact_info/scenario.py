# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.verification import ComposableScenario
from digiworld.scenarios.scenarios.ryde.base_scenario import RydeScenario
from digiworld.scenarios.answer_matchers import substring_match

_SUPPORT_INFO = {
    "number": "1-800-RYDE",
    "email": "support@ryde.com",
}


class SupportContactInfoScenario(RydeScenario, ComposableScenario):
    """Verify the agent reports the correct support contact information."""

    def _get_checks(self, state_path):
        expected = _SUPPORT_INFO.get(self.info_type.lower())
        if not expected:
            raise ValueError(f"Unknown info_type: {self.info_type}")

        return {"answer_matches": substring_match(self.agent_answer, expected)}
