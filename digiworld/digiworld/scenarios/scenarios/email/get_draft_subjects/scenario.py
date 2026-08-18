# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetDraftSubjects(EmailScenario, ComposableScenario):
    def _get_checks(self, state_path):
        query = """
        SELECT subject FROM emails
        WHERE sender = ? AND folder = 'draft'
        ORDER BY timestamp DESC
        """
        results = self._execute_query_in_path(
            query, (self.current_user_email,), self.initial_state_path
        )
        if not results:
            raise ValueError(
                f"No drafts found for user {self.current_user_email}. "
                f"This scenario requires at least one draft to exist."
            )

        subjects = [row[0] for row in results if row[0]]
        if not subjects:
            raise ValueError("All drafts have empty subjects")

        logger.info(
            f"Expected draft subjects: {subjects}, "
            f"agent answer: {self.agent_answer!r}"
        )

        return {
            "answer_matches": all_substrings_match(self.agent_answer, subjects),
        }
