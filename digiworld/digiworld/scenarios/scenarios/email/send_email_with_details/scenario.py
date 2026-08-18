# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendEmailWithDetails(EmailScenario, ComposableScenario):
    """Verify that an email was sent to a specific recipient with
    the expected subject and body content."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
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
                "subject_matches": False,
                "recipient_matches": False,
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

        return {
            "email_sent": True,
            "subject_matches": subject_matches,
            "recipient_matches": recipient_matches,
        }
