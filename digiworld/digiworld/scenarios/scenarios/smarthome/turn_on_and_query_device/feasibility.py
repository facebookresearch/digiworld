# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Turn on device and query info'."""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint
from digiworld.scenarios.scenarios.smarthome.shared import ROOMS_EXIST


class DeviceNotAlreadyOnConstraint(Constraint):
    """The verifier requires the named device to be off at the start: the
    profile must not already have it switched on (a device the profile does not
    have is injected, off, by the instance)."""

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        try:
            row = conn.execute(
                "SELECT is_on FROM devices WHERE LOWER(name) = LOWER(?) AND user_id = 1 "
                "AND deleted_at IS NULL",
                (str(params.get("device_name") or ""),),
            ).fetchone()
        except sqlite3.OperationalError:
            return False
        return row is None or not row[0]

    def describe(self) -> str:
        return "DeviceNotAlreadyOn(device_name)"


CONSTRAINTS = [ROOMS_EXIST, DeviceNotAlreadyOnConstraint()]
