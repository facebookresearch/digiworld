# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetPreferredModeScenario(TransitScenario, ComposableScenario):
    """Verify that the user's preferred transit modes match the specified value."""

    def _parse_modes(self, raw):
        if not raw:
            return set()

        parsed = raw
        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except json.JSONDecodeError:
                return {parsed}

        if isinstance(parsed, str):
            try:
                parsed = json.loads(parsed)
            except json.JSONDecodeError:
                return {parsed}

        if isinstance(parsed, list):
            return {mode for mode in parsed if isinstance(mode, str)}

        return set()

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
        actual_modes = self._parse_modes(raw)

        if " and " in self.mode:
            expected_modes = set(self.mode.split(" and "))
        else:
            expected_modes = {self.mode}

        matches = actual_modes == expected_modes

        logger.info(
            f"Preferred mode check: expected={sorted(expected_modes)}, "
            f"actual={sorted(actual_modes)}, matches={matches}"
        )

        return {"preferred_modes_match": matches}
