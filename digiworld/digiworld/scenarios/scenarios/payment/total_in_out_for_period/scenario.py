# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import logging

from digiworld.scenarios.answer_matchers import float_match
from digiworld.scenarios.scenarios.payment.base_scenario import PaymentScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

PERIOD_BOUNDARIES = {
    "today": lambda now: (
        now.replace(hour=0, minute=0, second=0, microsecond=0),
        now,
    ),
    "this week": lambda now: (
        (now - datetime.timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        ),
        now,
    ),
    "this month": lambda now: (
        now.replace(day=1, hour=0, minute=0, second=0, microsecond=0),
        now,
    ),
    "last month": lambda now: (
        (now.replace(day=1) - datetime.timedelta(days=1)).replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        ),
        now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        - datetime.timedelta(seconds=1),
    ),
    "last 3 months": lambda now: (
        (now - datetime.timedelta(days=90)).replace(
            hour=0, minute=0, second=0, microsecond=0
        ),
        now,
    ),
}


class TotalInOutForPeriodScenario(PaymentScenario, ComposableScenario):
    """Verify the agent reports the correct total in/out for a time period."""

    def _resolve_now(self):
        config = self.get_scenario_config()
        time_str = config.get("time")
        if time_str:
            return datetime.datetime.fromisoformat(time_str.replace("Z", "+00:00")).replace(tzinfo=None)
        return datetime.datetime.utcnow()

    def _get_checks(self, state_path):
        direction = getattr(self, "direction", None)
        period = getattr(self, "period", None)

        if not direction:
            raise ValueError("direction parameter is required")
        if not period:
            raise ValueError("period parameter is required")

        direction_lower = direction.lower().strip()
        period_lower = period.lower().strip()

        boundary_fn = PERIOD_BOUNDARIES.get(period_lower)
        if boundary_fn is None:
            raise ValueError(
                f"Unknown period '{period}'. "
                f"Expected one of: {', '.join(PERIOD_BOUNDARIES.keys())}"
            )

        now = self._resolve_now()
        start_dt, end_dt = boundary_fn(now)

        start_iso = start_dt.strftime("%Y-%m-%dT%H:%M:%S")
        end_iso = end_dt.strftime("%Y-%m-%dT%H:%M:%S")

        if direction_lower == "total in":
            query = (
                "SELECT COALESCE(SUM(t.amount), 0) FROM transactions t "
                "JOIN wallets w ON t.receiver_wallet_id = w.id "
                "WHERE w.user_id = ? "
                "AND t.status = 'completed' "
                "AND t.created_at >= ? AND t.created_at <= ? "
                "AND t.type IN ('deposit', 'transfer')"
            )
        elif direction_lower == "total out":
            query = (
                "SELECT COALESCE(SUM(t.amount), 0) FROM transactions t "
                "JOIN wallets w ON t.sender_wallet_id = w.id "
                "WHERE w.user_id = ? "
                "AND t.status = 'completed' "
                "AND t.created_at >= ? AND t.created_at <= ? "
                "AND t.type IN ('withdrawal', 'transfer')"
            )
        else:
            raise ValueError(
                f"Unknown direction '{direction}'. "
                f"Expected 'total in' or 'total out'"
            )

        params = (self.current_user_id, start_iso, end_iso)
        rows = self._execute_query_in_path(query, params, self.initial_state_path)
        expected_total = float(rows[0][0]) if rows else 0.0

        logger.info(
            "TotalInOut: direction=%r, period=%r, range=[%s, %s], "
            "expected=%.2f, agent_answer=%r",
            direction, period, start_iso, end_iso,
            expected_total, self.agent_answer,
        )

        if expected_total == 0.0:
            answer_lower = self.agent_answer.lower().strip()
            matches = (
                float_match(self.agent_answer, 0.0)
                or answer_lower in ("0", "$0", "$0.00", "0.00", "$0.0")
            )
        else:
            matches = float_match(self.agent_answer, expected_total)

        return {"total_matches": matches}
