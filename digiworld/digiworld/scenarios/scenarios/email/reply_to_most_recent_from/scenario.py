# Copyright (c) Meta Platforms, Inc. and affiliates.
import logging
from typing import Dict

from digiworld.scenarios.builders import derive_email_from_name
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class ReplyToMostRecentFrom(EmailScenario, ComposableScenario):
    """Verify that a reply was sent to the most recent email from a sender."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        expected_recipient = derive_email_from_name(self.sender_name)

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

        for row in new_emails:
            receiver_str = (row[2] or "").lower()
            if expected_recipient.lower() in receiver_str:
                reply_found = True
                email_body = row[4] or ""
                if self.email_body.lower() in email_body.lower():
                    body_matches = True
                break

        logger.info(
            f"Expected recipient: {expected_recipient}, "
            f"reply_found: {reply_found}, body_matches: {body_matches}"
        )

        return {
            "reply_sent": reply_found,
            "reply_body_matches": body_matches,
        }
