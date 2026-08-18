# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import numeric_match
from digiworld.scenarios.scenarios.eats.base_scenario import EatsScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CheckEstimatedOrderTimeScenario(EatsScenario, ComposableScenario):
    """Verify that the agent correctly reports the estimated delivery time."""

    def _get_checks(self, state_path):
        restaurant = getattr(self, "restaurant", None)
        if not restaurant:
            raise ValueError("restaurant parameter is required")

        expected_minutes = 20
        logger.info(
            f"Expected delivery time: {expected_minutes} min, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": numeric_match(self.agent_answer, expected_minutes),
        }
