# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class UncheckAllModesScenario(TransitScenario, ComposableScenario):
    """Verify that all preferred transit modes have been unchecked."""

    def _parse_modes(self, raw):
        if not raw:
            return []

        parsed = raw
        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except json.JSONDecodeError:
                return [parsed]

        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except json.JSONDecodeError:
                return [parsed]

        if isinstance(parsed, list):
            return [mode for mode in parsed if isinstance(mode, str)]

        return []

    def _get_checks(self, state_path):
        query = (
            "SELECT preferred_modes FROM user_preferences WHERE user_id = ?"
        )
        rows = self._execute_query_in_path(query, (1,), state_path)

        if not rows:
            raise ValueError(
                "No user_preferences record found for user_id=1"
            )

        raw = rows[0][0]
        modes = self._parse_modes(raw)
        is_empty = len(modes) == 0

        logger.info(
            f"Uncheck all modes check: actual_modes={modes}, "
            f"is_empty={is_empty}"
        )

        return {"all_modes_unchecked": is_empty}
