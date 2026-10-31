# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Feasibility constraints for 'Set my chat wallpaper to <wallpaper>'.

The verifier treats a wallpaper that is already the requested one as a vacuous
change (setting_was_different), so the user's current wallpaper must differ.
"""

import sqlite3
from typing import Any, Dict

from digiworld.scenarios.constraints import Constraint
from digiworld.scenarios.scenarios.message.shared import HAS_CHAT_SETTINGS


class WallpaperDiffersConstraint(Constraint):
    """Same matching rule as SetChatWallpaperScenario: 'default' = no wallpaper
    or a path naming default; otherwise the key appears in the path."""

    def evaluate(self, conn: sqlite3.Connection, params: Dict[str, Any]) -> bool:
        key = str(params.get("wallpaper") or "").strip().lower()
        try:
            row = conn.execute(
                "SELECT wallpaper FROM chat_settings WHERE user_id = 1"
            ).fetchone()
        except sqlite3.OperationalError:
            return False
        current = (row[0] if row else None) or ""
        if key == "default":
            already = not current or "default" in current.lower()
        else:
            already = key in current.lower()
        return not already

    def describe(self) -> str:
        return "WallpaperDiffers(chat_settings.wallpaper != wallpaper)"


CONSTRAINTS = [HAS_CHAT_SETTINGS, WallpaperDiffersConstraint()]
