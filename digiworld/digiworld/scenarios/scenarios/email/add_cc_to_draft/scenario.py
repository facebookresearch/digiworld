# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
from typing import Dict

from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class AddCcToDraft(EmailScenario, ComposableScenario):
    """Verify that CC recipients were added to a draft email."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        query = """
        SELECT cc FROM emails
        WHERE subject LIKE ? AND folder = 'draft'
        ORDER BY timestamp DESC
        LIMIT 1
        """
        results = self._execute_query_in_path(
            query, (f"%{self.email_subject}%",), state_path
        )
        if not results:
            raise ValueError(
                f"No draft found with subject containing '{self.email_subject}'"
            )

        cc_raw = results[0][0] or "[]"
        cc_list = json.loads(cc_raw) if isinstance(cc_raw, str) else cc_raw
        if not isinstance(cc_list, list):
            cc_list = []
        cc_lower = [c.lower() for c in cc_list]

        expected_emails = [
            email.strip().lower()
            for email in getattr(self, "recipient_emails", "").split(",")
            if email.strip()
        ]

        all_found = True
        for email in expected_emails:
            found = email in cc_lower
            if not found:
                logger.info(f"CC recipient not found: {email} in {cc_list}")
                all_found = False

        logger.info(
            f"Expected CC emails: {expected_emails}, "
            f"actual CC: {cc_list}, all_found: {all_found}"
        )

        return {
            "cc_updated": len(cc_list) > 0,
            "all_recipients_added": all_found,
        }
