import json
import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddCcAndListDraftsScenario(EmailScenario, ComposableScenario):
    """Composed scenario: add CC recipients to a draft email, then
    report the subjects of all current email drafts.

    Combines verification logic from ``add_cc_to_draft`` (action) and
    ``get_draft_subjects`` (info-retrieval).  The agent must both update
    the draft's CC field *and* correctly list all draft subjects,
    including the one just modified.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # -- CC update verification (from add_cc_to_draft) ---------------------

        cc_query = """
        SELECT cc FROM emails
        WHERE subject LIKE ? AND folder = 'draft'
        ORDER BY timestamp DESC
        LIMIT 1
        """
        cc_results = self._execute_query_in_path(
            cc_query, (f"%{self.email_subject}%",), state_path
        )

        if not cc_results:
            return {
                "cc_updated": False,
                "all_recipients_added": False,
                "draft_subjects_correct": False,
            }

        cc_raw = cc_results[0][0] or "[]"
        cc_list = json.loads(cc_raw) if isinstance(cc_raw, str) else cc_raw
        if not isinstance(cc_list, list):
            cc_list = []
        cc_lower = [c.lower() for c in cc_list]

        expected_emails = [e.strip().lower() for e in self.recipient_emails.split(",")]

        all_found = True
        for email in expected_emails:
            found = email in cc_lower
            if not found:
                logger.info(f"CC recipient not found: {email} in {cc_list}")
                all_found = False

        cc_updated = len(cc_list) > 0

        # -- Draft subjects verification (from get_draft_subjects) -------------

        draft_query = """
        SELECT subject FROM emails
        WHERE sender = ? AND folder = 'draft'
        ORDER BY timestamp DESC
        """
        draft_results = self._execute_query_in_path(
            draft_query, (self.current_user_email,), state_path
        )
        logger.info("Draft query results: %r", draft_results)

        if not draft_results:
            draft_subjects_ok = False
            draft_subjects = []
        else:
            draft_subjects = [row[0] for row in draft_results if row[0]]
            if not draft_subjects:
                draft_subjects_ok = False
            else:
                draft_subjects_ok = all_substrings_match(
                    self.agent_answer, draft_subjects
                )
        logger.info("Draft subjects used for verification: %r", draft_subjects)

        logger.info(
            "Add CC & list drafts: cc_updated=%s, all_recipients_added=%s, "
            "draft_subjects_ok=%s, agent_answer=%r",
            cc_updated, all_found, draft_subjects_ok, self.agent_answer,
        )

        return {
            "cc_updated": cc_updated,
            "all_recipients_added": all_found,
            "draft_subjects_correct": draft_subjects_ok,
        }
