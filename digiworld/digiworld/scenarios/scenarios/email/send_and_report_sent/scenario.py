# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import substring_match
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendAndReportSentScenario(EmailScenario, ComposableScenario):
    """Composed scenario: send an email, then report the subject and
    recipient of the most recently sent email.

    Combines verification logic from ``send_email_with_details`` (action)
    and ``get_most_recent_sent_info`` (info-retrieval).  Since the just-sent
    email IS the most recent, the agent's answer should contain both the
    subject and the recipient email.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # -- Send email verification (from send_email_with_details) ---------

        query = """
        SELECT id, sender, receiver, subject, body
        FROM emails
        WHERE sender = ? AND (folder = 'sent' OR status = 'sent')
        ORDER BY timestamp DESC
        """
        _, _, new_emails = self.compare_database_records(
            self.initial_state_path,
            state_path,
            query,
            (self.current_user_email,),
        )

        if not new_emails:
            return {
                "email_sent": False,
                "subject_matches_in_db": False,
                "recipient_matches_in_db": False,
                "answer_contains_subject": False,
                "answer_contains_recipient": False,
            }

        recipient_email_lower = self.recipient_email.lower()
        subject_lower = self.email_subject.lower()

        subject_matches = False
        recipient_matches = False

        for row in new_emails:
            _, _, receiver_json, subj, _ = row

            if subj and subject_lower in subj.lower():
                subject_matches = True

            receiver_text = receiver_json.lower() if receiver_json else ""
            if recipient_email_lower in receiver_text:
                recipient_matches = True

        # -- Answer verification (from get_most_recent_sent_info) -----------
        # The just-sent email IS the most recent sent email, so the answer
        # should contain the subject and the recipient.

        answer_has_subject = substring_match(
            self.agent_answer, self.email_subject
        )
        answer_has_recipient = substring_match(
            self.agent_answer, self.recipient_email
        )

        logger.info(
            "Send & report sent: subject_matches=%s, recipient_matches=%s, "
            "answer_has_subject=%s, answer_has_recipient=%s, "
            "agent_answer=%r",
            subject_matches, recipient_matches,
            answer_has_subject, answer_has_recipient,
            self.agent_answer,
        )

        return {
            "email_sent": True,
            "subject_matches_in_db": subject_matches,
            "recipient_matches_in_db": recipient_matches,
            "answer_contains_subject": answer_has_subject,
            "answer_contains_recipient": answer_has_recipient,
        }
