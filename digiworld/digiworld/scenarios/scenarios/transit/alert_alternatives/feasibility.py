# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for alert alternatives retrieval.

The verifier raises when the alert it reads has no recommended
alternatives, so an alert of that title in the profile must carry some (an
alert the profile does not have is injected by the instance).
"""

import json
import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint
from digiworld.scenarios.scenarios.transit.shared import SERVICE_ALERTS_EXIST


class AlertHasAlternativesConstraint(Constraint):
    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        try:
            row = conn.execute(
                "SELECT recommended_alternatives FROM service_alerts WHERE title = ?",
                (str(params.get("alert_title") or ""),),
            ).fetchone()
        except sqlite3.OperationalError:
            return False
        if row is None:
            return True
        if not row[0]:
            return False
        raw = row[0]
        try:
            value = json.loads(raw) if isinstance(raw, str) else raw
        except ValueError:
            value = raw
        return bool(value.strip() if isinstance(value, str) else value)

    def describe(self) -> str:
        return "AlertHasAlternatives(alert_title)"


CONSTRAINTS = [SERVICE_ALERTS_EXIST, AlertHasAlternativesConstraint()]
