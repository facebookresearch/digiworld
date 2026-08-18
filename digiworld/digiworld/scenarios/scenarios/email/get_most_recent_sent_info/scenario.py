# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class GetMostRecentSentInfo(EmailScenario, ComposableScenario):
    def _get_checks(self, state_path):
        query = """
        SELECT subject, receiver FROM emails
        WHERE sender = ? AND folder = 'sent' AND status = 'sent'
        ORDER BY timestamp DESC
        LIMIT 1
        """
        results = self._execute_query_in_path(
            query, (self.current_user_email,), self.initial_state_path
        )
        if not results:
            raise ValueError(
                f"No sent emails found for user {self.current_user_email}. "
                f"This scenario requires at least one sent email to exist."
            )

        expected_subject = results[0][0] or ""
        receiver_raw = results[0][1] or "[]"

        try:
            receivers = json.loads(receiver_raw) if isinstance(receiver_raw, str) else receiver_raw
        except (json.JSONDecodeError, TypeError):
            receivers = receiver_raw

        # Build a list of acceptable recipient identifiers (email, name parts)
        recipient_candidates: list[str] = []
        if isinstance(receivers, list):
            for r in receivers:
                if isinstance(r, dict):
                    for v in (r.get("email"), r.get("name"), r.get("address")):
                        if v:
                            recipient_candidates.append(str(v))
                elif isinstance(r, str) and r:
                    recipient_candidates.append(r)
        elif isinstance(receivers, str) and receivers:
            recipient_candidates.append(receivers)

        if not recipient_candidates:
            raise ValueError(f"Cannot parse receiver field: {receiver_raw}")

        recipient_matches = any(
            substring_match(self.agent_answer, c) for c in recipient_candidates
        )

        logger.info(
            "Expected subject=%r, recipient_candidates=%s, agent answer=%r",
            expected_subject, recipient_candidates, self.agent_answer,
        )

        return {
            "subject_matches": substring_match(self.agent_answer, expected_subject),
            "recipient_matches": recipient_matches,
        }
