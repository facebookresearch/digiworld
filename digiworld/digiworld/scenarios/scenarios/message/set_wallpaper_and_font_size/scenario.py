import json
import logging
import os
from typing import Dict

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)


class SetWallpaperAndFontSizeScenario(MessageScenario, ComposableScenario):
    """Verify that the chat wallpaper was changed and the font size was updated."""

    def _get_checks(self, state_path: str) -> Dict[str, bool]:
        wallpaper = getattr(self, "wallpaper", None)
        font_size = getattr(self, "font_size", None)
        if not wallpaper:
            raise ValueError("wallpaper parameter is required")
        if not font_size:
            raise ValueError("font_size parameter is required")

        wp_key = wallpaper.lower()

        # --- Part 1: wallpaper check (from set_chat_wallpaper) ---

        wallpaper_updated = False

        # Check rootstore
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if os.path.exists(rootstore_path):
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)
            actual_wallpaper = (
                rootstore.get("userStore", {})
                .get("chatSettings", {})
                .get("wallpaper")
            )
            if wp_key == "default":
                rootstore_ok = (
                    actual_wallpaper is None
                    or "default" in str(actual_wallpaper).lower()
                )
            else:
                rootstore_ok = (
                    actual_wallpaper is not None
                    and wp_key in actual_wallpaper.lower()
                )
        else:
            rootstore_ok = False

        # Check DB
        query = "SELECT wallpaper FROM chat_settings WHERE user_id = ?"
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )
        if rows:
            db_wallpaper = rows[0][0]
            if wp_key == "default":
                db_ok = (
                    db_wallpaper is None
                    or "default" in str(db_wallpaper).lower()
                )
            else:
                db_ok = (
                    db_wallpaper is not None
                    and wp_key in db_wallpaper.lower()
                )
        else:
            db_ok = False

        wallpaper_updated = rootstore_ok or db_ok

        # --- Part 2: font size check (from set_font_size) ---

        font_query = "SELECT font_size FROM chat_settings WHERE user_id = ?"
        font_rows = self._execute_query_in_path(
            font_query, (self.current_user_id,), state_path
        )

        if not font_rows:
            font_size_updated = False
        else:
            actual_font = font_rows[0][0]
            font_size_updated = (
                actual_font is not None
                and actual_font.lower() == font_size.lower()
            )

        logger.info(
            "Set wallpaper and font size check: "
            "wallpaper_updated=%s (rootstore=%s, db=%s), "
            "font_size_updated=%s",
            wallpaper_updated, rootstore_ok, db_ok, font_size_updated,
        )

        return {
            "wallpaper_updated": wallpaper_updated,
            "font_size_updated": font_size_updated,
        }
