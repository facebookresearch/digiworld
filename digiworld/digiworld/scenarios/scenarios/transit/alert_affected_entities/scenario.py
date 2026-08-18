# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.transit.base_scenario import TransitScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AlertAffectedEntitiesScenario(TransitScenario, ComposableScenario):
    """Verify that the agent correctly reports lines or stops affected by a service alert."""

    def _get_checks(self, state_path):
        entity_type = getattr(self, "entity_type", None)
        alert_title = getattr(self, "alert_title", None)
        if not entity_type:
            raise ValueError("entity_type parameter is required")
        if not alert_title:
            raise ValueError("alert_title parameter is required")

        if entity_type == "lines":
            query = (
                "SELECT l.name FROM alert_lines al "
                "JOIN lines l ON al.line_id = l.id "
                "JOIN service_alerts sa ON al.alert_id = sa.id "
                "WHERE sa.title = ?"
            )
        elif entity_type == "stops":
            query = (
                "SELECT s.name FROM alert_stops ast "
                "JOIN stops s ON ast.stop_id = s.id "
                "JOIN service_alerts sa ON ast.alert_id = sa.id "
                "WHERE sa.title = ?"
            )
        else:
            raise ValueError(f"Unsupported entity_type: '{entity_type}'")

        rows = self._execute_query_in_path(query, (alert_title,), state_path)

        if not rows:
            logger.warning(
                "No %s found for service alert %r in %s",
                entity_type,
                alert_title,
                state_path,
            )
            return {"answer_matches": False}

        expected_names = [row[0] for row in rows]
        logger.info(
            f"Expected {entity_type}: {expected_names}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {
            "answer_matches": all_substrings_match(self.agent_answer, expected_names)
        }
