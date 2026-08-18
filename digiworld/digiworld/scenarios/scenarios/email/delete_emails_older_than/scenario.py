# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
from datetime import datetime

from digiworld.scenarios.scenarios.email.base_scenario import EmailScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

DATE_FORMATS = [
    "%B %d, %Y",
    "%b %d, %Y",
    "%Y-%m-%d",
    "%m/%d/%Y",
    "%d %B %Y",
    "%d %b %Y",
]


class DeleteEmailsOlderThan(EmailScenario, ComposableScenario):

    def _parse_cutoff_date(self):
        for fmt in DATE_FORMATS:
            try:
                return datetime.strptime(self.date.strip(), fmt)
            except ValueError:
                continue
        raise ValueError(f"Cannot parse date: {self.date}")

    def _get_checks(self, state_path):
        cutoff = self._parse_cutoff_date()
        cutoff_iso = cutoff.strftime("%Y-%m-%dT00:00:00")

        query = """
        SELECT id, timestamp FROM emails
        WHERE receiver LIKE ? AND folder = 'inbox' AND status = 'received'
        """
        initial_emails = self._execute_query_in_path(
            query, (f"%{self.current_user_email}%",), self.initial_state_path
        )

        old_ids = []
        recent_ids = []
        for row in initial_emails:
            email_id, ts = row[0], row[1]
            if ts < cutoff_iso:
                old_ids.append(email_id)
            else:
                recent_ids.append(email_id)

        if not old_ids:
            raise ValueError(
                f"No emails older than {self.date} found in initial state. "
                f"The scenario requires old emails to exist."
            )

        old_still_in_inbox = 0
        for eid in old_ids:
            check_query = "SELECT folder FROM emails WHERE id = ?"
            results = self._execute_query_in_path(check_query, (eid,), state_path)
            if results and results[0][0] == "inbox":
                old_still_in_inbox += 1

        recent_removed = 0
        for eid in recent_ids:
            check_query = "SELECT folder FROM emails WHERE id = ?"
            results = self._execute_query_in_path(check_query, (eid,), state_path)
            if not results or results[0][0] != "inbox":
                recent_removed += 1

        old_deleted = old_still_in_inbox == 0
        recent_preserved = recent_removed == 0

        logger.info(
            f"Cutoff: {cutoff_iso}, old emails: {len(old_ids)} "
            f"(still in inbox: {old_still_in_inbox}), "
            f"recent emails: {len(recent_ids)} (removed: {recent_removed})"
        )

        return {
            "old_emails_deleted": old_deleted,
            "recent_emails_preserved": recent_preserved,
        }
