# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.builders import derive_email_from_name
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ReplyAndReportSentScenario(EmailScenario, ComposableScenario):
    """Composed scenario: reply to the most recent email from a sender,
    then report the subject and recipient of the most recently sent email.

    Combines verification logic from ``reply_to_most_recent_from`` (action)
    and ``get_most_recent_sent_info`` (info-retrieval).  The reply becomes
    the most recent sent email; the recipient is the original sender's
    email, and the subject is typically "Re: [original subject]".
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        expected_recipient = derive_email_from_name(self.sender_name)

        # -- Reply verification (from reply_to_most_recent_from) ------------

        query = """
        SELECT id, sender, receiver, subject, body FROM emails
        WHERE sender = ? AND (folder = 'sent' OR status = 'sent')
        ORDER BY timestamp DESC
        """
        _, _, new_emails = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_email,),
        )

        reply_found = False
        body_matches = False
        reply_subject = ""

        for row in new_emails:
            receiver_str = (row[2] or "").lower()
            if expected_recipient.lower() in receiver_str:
                reply_found = True
                email_body = row[4] or ""
                reply_subject = row[3] or ""
                if self.email_body.lower() in email_body.lower():
                    body_matches = True
                break

        # -- Answer verification (from get_most_recent_sent_info) -----------
        # The reply IS the most recent sent email.
        # The recipient is the original sender; the subject is the reply subject.

        answer_has_recipient = substring_match(
            self.agent_answer, expected_recipient
        )

        # Also accept the sender_name in case the agent reports name not email
        if not answer_has_recipient:
            answer_has_recipient = substring_match(
                self.agent_answer, self.sender_name
            )

        # For the subject, check that the agent's answer contains
        # the reply subject (which should contain the original subject).
        # If we found the reply, use its actual subject; otherwise fall back.
        answer_has_subject = False
        if reply_subject:
            answer_has_subject = substring_match(
                self.agent_answer, reply_subject
            )

        logger.info(
            "Reply & report sent: expected_recipient=%s, "
            "reply_found=%s, body_matches=%s, reply_subject=%r, "
            "answer_has_recipient=%s, answer_has_subject=%s, "
            "agent_answer=%r",
            expected_recipient,
            reply_found, body_matches, reply_subject,
            answer_has_recipient, answer_has_subject,
            self.agent_answer,
        )

        return {
            "reply_sent": reply_found,
            "reply_body_matches": body_matches,
            "answer_contains_recipient": answer_has_recipient,
            "answer_contains_subject": answer_has_subject,
        }
