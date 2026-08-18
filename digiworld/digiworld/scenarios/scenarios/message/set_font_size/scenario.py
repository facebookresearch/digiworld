# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetFontSizeScenario(MessageScenario, ComposableScenario):
    """Verify that the chat font size was updated correctly."""

    def _get_checks(self, state_path):
        font_size = getattr(self, "font_size", None)
        if not font_size:
            raise ValueError("font_size parameter is required")

        query = "SELECT font_size FROM chat_settings WHERE user_id = ?"

        # Log precondition for diagnostics but don't gate pass/fail on it
        initial_rows = self._execute_query_in_path(
            query, (self.current_user_id,), self.initial_state_path
        )
        if initial_rows:
            initial_font_size = initial_rows[0][0]
            if initial_font_size and initial_font_size.lower() == font_size.lower():
                logger.warning(
                    "font_size was already '%s' in initial state — vacuous truth",
                    font_size,
                )

        # Check the final state
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )

        if not rows:
            logger.warning(
                "No chat_settings row for user_id=%s", self.current_user_id
            )
            return {
                "font_size_updated": False,
            }

        actual = rows[0][0]
        result = actual.lower() == font_size.lower()
        logger.info(
            "font_size_updated: expected=%s, actual=%s, match=%s",
            font_size, actual, result,
        )
        return {
            "font_size_updated": result,
        }
