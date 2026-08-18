import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SendEmailAndReportDraftsScenario(EmailScenario, ComposableScenario):
    """Composed scenario: send an email, then report the subjects
    of all current email drafts.

    Combines verification logic from ``send_email_with_details`` (action)
    and ``get_draft_subjects`` (info-retrieval).  The agent must both
    send the email successfully *and* correctly list the draft subjects.
    This tests that the agent does not confuse sent emails with drafts.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # -- Send email verification (from send_email_with_details) ------------

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
                "draft_subjects_correct": False,
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

        # -- Draft subjects verification (from get_draft_subjects) -------------
        # Use the final state to check drafts (the sent email should NOT
        # appear as a draft).

        draft_query = """
        SELECT subject FROM emails
        WHERE sender = ? AND folder = 'draft'
        ORDER BY timestamp DESC
        """
        draft_results = self._execute_query_in_path(
            draft_query, (self.current_user_email,), state_path
        )

        if not draft_results:
            # No drafts exist -- agent should report that there are no drafts.
            # We treat this as correct if the agent doesn't hallucinate subjects.
            draft_subjects_ok = True
        else:
            draft_subjects = [row[0] for row in draft_results if row[0]]
            if not draft_subjects:
                draft_subjects_ok = True
            else:
                draft_subjects_ok = all_substrings_match(
                    self.agent_answer, draft_subjects
                )

        logger.info(
            "Send email & report drafts: subject_matches=%s, "
            "recipient_matches=%s, draft_subjects_ok=%s, "
            "agent_answer=%r",
            subject_matches, recipient_matches, draft_subjects_ok,
            self.agent_answer,
        )

        return {
            "email_sent": True,
            "subject_matches_in_db": subject_matches,
            "recipient_matches_in_db": recipient_matches,
            "draft_subjects_correct": draft_subjects_ok,
        }
