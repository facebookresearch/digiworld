# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import logging
import re

from digiworld.scenarios.answer_matchers import (
    date_match,
    extract_date,
    substring_match,
    time_match,
)
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class RecentTransactionDetailScenario(PaymentScenario, ComposableScenario):
    """Verify that the agent correctly reports a detail of the most recent transaction."""

    _TRANSACTION_QUERY = (
        "SELECT t.reference, t.created_at, t.receiver_wallet_id, t.type "
        "FROM transactions t "
        "JOIN wallets w ON t.sender_wallet_id = w.id OR t.receiver_wallet_id = w.id "
        "WHERE w.user_id = ? "
        "ORDER BY t.created_at DESC "
        "LIMIT 1"
    )

    @staticmethod
    def _parse_created_at(created_at: str) -> datetime.datetime:
        return datetime.datetime.fromisoformat(created_at.replace("Z", "+00:00"))

    @classmethod
    def _candidate_datetimes(cls, created_at: str):
        dt = cls._parse_created_at(created_at)
        candidates = [dt]
        if dt.tzinfo is not None:
            local_dt = dt.astimezone()
            if (
                local_dt.tzinfo != dt.tzinfo
                or local_dt.time() != dt.time()
                or local_dt.date() != dt.date()
            ):
                candidates.append(local_dt)
        return candidates

    @staticmethod
    def _extract_flexible_date(agent_answer: str):
        parsed = extract_date(agent_answer)
        if parsed is not None:
            return parsed

        for pattern in (r"\b\d{2}-\d{2}-\d{4}\b", r"\b\d{2}/\d{2}/\d{4}\b"):
            match = re.search(pattern, agent_answer)
            if not match:
                continue
            candidate = match.group(0)
            for fmt in ("%d-%m-%Y", "%d/%m/%Y"):
                try:
                    return datetime.datetime.strptime(candidate, fmt).date()
                except ValueError:
                    continue
        return None

    def _get_checks(self, state_path):
        rows = self._execute_query_in_path(
            self._TRANSACTION_QUERY,
            (self.current_user_id,),
            self.initial_state_path,
        )

        if not rows:
            raise ValueError(
                f"No transactions found for user {self.current_user_id}"
            )

        reference, created_at, receiver_wallet_id, tx_type = rows[0]
        candidate_datetimes = self._candidate_datetimes(created_at)

        detail_type = self.detail_type

        if detail_type == "reference number":
            matched = substring_match(self.agent_answer, reference)

        elif detail_type == "date":
            parsed_date = self._extract_flexible_date(self.agent_answer)
            candidate_dates = [dt.date() for dt in candidate_datetimes]
            matched = (
                any(date_match(self.agent_answer, candidate_date) for candidate_date in candidate_dates)
                or parsed_date in candidate_dates
            )

        elif detail_type == "time":
            matched = any(
                time_match(self.agent_answer, dt.time())
                for dt in candidate_datetimes
            )

        elif detail_type == "recipient email address":
            if tx_type != "transfer":
                raise ValueError(
                    f"Transaction type is {tx_type!r}, not 'transfer'; "
                    f"no recipient for this transaction"
                )

            email_query = (
                "SELECT u.email FROM users u "
                "JOIN wallets w ON w.user_id = u.id "
                "WHERE w.id = ?"
            )
            email_rows = self._execute_query_in_path(
                email_query,
                (receiver_wallet_id,),
                self.initial_state_path,
            )
            if not email_rows:
                raise ValueError(
                    f"No user found for receiver wallet {receiver_wallet_id}"
                )
            recipient_email = email_rows[0][0]
            matched = substring_match(self.agent_answer, recipient_email)

        else:
            raise ValueError(
                f"Unrecognized detail_type: {detail_type!r}. "
                f"Expected one of: 'reference number', 'date', 'time', "
                f"'recipient email address'"
            )

        logger.info(
            f"detail_type={detail_type!r}, matched={matched}, "
            f"agent answer: {self.agent_answer!r}"
        )
        return {"answer_matches": matched}
