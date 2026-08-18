# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Composed scenario: set home stop then set work stop."""

import logging

from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetHomeAndWorkStopScenario(TransitScenario, ComposableScenario):
    """Verify that the agent set both the home and work stops.

    Combines set_home_stop (home_stop_id points to correct stop)
    + set_work_stop (work_stop_id points to correct stop).
    """

    def _get_checks(self, state_path):
        # Check home stop
        home_query = (
            "SELECT s.name FROM user_preferences up "
            "JOIN stops s ON up.home_stop_id = s.id "
            "WHERE up.user_id = ?"
        )
        home_rows = self._execute_query_in_path(
            home_query, (self.current_user_id,), state_path
        )

        if not home_rows:
            home_matches = False
        else:
            actual_home = home_rows[0][0]
            home_matches = (
                actual_home.strip().lower() == self.home_stop.strip().lower()
            )
            logger.info(
                "Home stop check: expected=%r, actual=%r, matches=%s",
                self.home_stop, actual_home, home_matches,
            )

        # Check work stop
        work_query = (
            "SELECT s.name FROM user_preferences up "
            "JOIN stops s ON up.work_stop_id = s.id "
            "WHERE up.user_id = ?"
        )
        work_rows = self._execute_query_in_path(
            work_query, (self.current_user_id,), state_path
        )

        if not work_rows:
            work_matches = False
        else:
            actual_work = work_rows[0][0]
            work_matches = (
                actual_work.strip().lower() == self.work_stop.strip().lower()
            )
            logger.info(
                "Work stop check: expected=%r, actual=%r, matches=%s",
                self.work_stop, actual_work, work_matches,
            )

        return {
            "home_stop_matches": home_matches,
            "work_stop_matches": work_matches,
        }
