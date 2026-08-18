import logging
from typing import Dict

from digiworld.scenarios.answer_matchers import all_substrings_match
from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class CreateDraftAndListSubjectsScenario(EmailScenario, ComposableScenario):
    """Composed scenario: create a draft email, then list all draft subjects.

    Combines verification logic from ``create_draft_with_subject`` (action)
    and ``get_draft_subjects`` (info-retrieval).  The agent's answer must
    include both the newly created draft subject and all pre-existing draft
    subjects.
    """

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        # -- Draft creation verification (from create_draft_with_subject) ---

        draft_query = """
        SELECT id, sender, receiver, subject, body, timestamp, status
        FROM emails
        WHERE status = 'draft'
            AND subject LIKE ?
            AND folder != 'trash'
            AND status != 'deleted'
        ORDER BY timestamp DESC
        """
        _, _, new_drafts = self.compare_database_records(
            self.initial_state_path,
            state_path,
            draft_query,
            (f'%{self.subject}%',),
        )
        draft_created = len(new_drafts) > 0

        # -- Draft subjects answer verification (from get_draft_subjects) ---
        # Collect ALL draft subjects from the final state (pre-existing + new)

        all_drafts_query = """
        SELECT subject FROM emails
        WHERE sender = ? AND folder = 'draft'
        ORDER BY timestamp DESC
        """
        all_draft_rows = self._execute_query_in_path(
            all_drafts_query, (self.current_user_email,), state_path
        )

        all_subjects = [row[0] for row in all_draft_rows if row[0]]

        if not all_subjects:
            # At minimum the newly created draft should be there
            all_subjects = [self.subject]

        answer_ok = all_substrings_match(self.agent_answer, all_subjects)

        logger.info(
            "Create draft & list subjects: draft_created=%s, "
            "all_subjects=%s, agent_answer=%r, answer_ok=%s",
            draft_created, all_subjects, self.agent_answer, answer_ok,
        )

        return {
            "draft_created": draft_created,
            "answer_lists_all_subjects": answer_ok,
        }
