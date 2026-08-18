# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import logging
import os

from digiworld.scenarios.scenarios.message.base_scenario import MessageScenario
from digiworld.scenarios.verification import ComposableScenario

logger = logging.getLogger(__name__)

WALLPAPER_PATHS = {
    "default": None,
    "gradient": "/wallpapers/gradient.png",
    "space": "/wallpapers/space.png",
}


class SetChatWallpaperScenario(MessageScenario, ComposableScenario):
    """Verify that the chat wallpaper was updated correctly."""

    def _get_checks(self, state_path):
        wallpaper = getattr(self, "wallpaper", None)
        if not wallpaper:
            raise ValueError("wallpaper parameter is required")

        wp_key = wallpaper.lower()

        # --- Precondition: verify wallpaper was different in the initial state ---
        setting_was_different = self._check_initial_wallpaper_differs(
            wp_key, state_path
        )
        if not setting_was_different:
            logger.warning(
                "wallpaper was already '%s' in initial state — vacuous truth",
                wp_key,
            )

        # --- rootstore check ---
        rootstore_path = os.path.join(state_path, "rootstore.json")
        if not os.path.exists(rootstore_path):
            logger.warning("rootstore.json not found at %s", rootstore_path)
            return {
                "setting_was_different": setting_was_different,
                "wallpaper_updated": False,
            }

        with open(rootstore_path, "r") as f:
            rootstore = json.load(f)

        user_store = rootstore.get("userStore", {})
        chat_settings = user_store.get("chatSettings", {})
        actual_wallpaper = chat_settings.get("wallpaper")

        if wp_key == "default":
            rootstore_ok = actual_wallpaper is None or "default" in str(actual_wallpaper).lower()
        else:
            rootstore_ok = actual_wallpaper is not None and wp_key in actual_wallpaper.lower()

        logger.info(
            "rootstore check: wallpaper=%r, expected_key=%s, ok=%s",
            actual_wallpaper, wp_key, rootstore_ok,
        )

        # --- DB secondary check ---
        query = "SELECT wallpaper FROM chat_settings WHERE user_id = ?"
        rows = self._execute_query_in_path(
            query, (self.current_user_id,), state_path
        )

        if rows:
            db_wallpaper = rows[0][0]
            if wp_key == "default":
                db_ok = db_wallpaper is None or "default" in str(db_wallpaper).lower()
            else:
                db_ok = db_wallpaper is not None and wp_key in db_wallpaper.lower()
            logger.info(
                "db check: wallpaper=%r, expected_key=%s, ok=%s",
                db_wallpaper, wp_key, db_ok,
            )
        else:
            db_ok = False
            logger.warning(
                "No chat_settings row for user_id=%s", self.current_user_id
            )

        return {
            "setting_was_different": setting_was_different,
            "wallpaper_updated": rootstore_ok or db_ok,
        }

    @staticmethod
    def _wallpaper_matches(wallpaper_value, wp_key):
        """Return True when *wallpaper_value* already represents *wp_key*."""
        if wp_key == "default":
            return (
                wallpaper_value is None
                or "default" in str(wallpaper_value).lower()
            )
        return (
            wallpaper_value is not None
            and wp_key in wallpaper_value.lower()
        )

    def _check_initial_wallpaper_differs(self, wp_key, state_path=None):
        """Check whether the wallpaper in the initial state differs from
        the target.

        When *state_path* is supplied (the final / checked state), it is
        inspected **first**.  If the wallpaper there already matches the
        target and is identical to the initial-state wallpaper, the
        scenario is trivially satisfied and the method returns ``False``.
        This eliminates false-positives that occurred when
        ``self.initial_state_path`` pointed to a slightly different copy
        of the data.
        """
        # --- helper: read wallpaper from a rootstore file ----------------
        def _read_rootstore_wallpaper(dirpath):
            rs_path = os.path.join(dirpath, "rootstore.json")
            if not os.path.exists(rs_path):
                return None, False          # value, exists
            with open(rs_path, "r") as fh:
                rs = json.load(fh)
            wp = (
                rs.get("userStore", {})
                .get("chatSettings", {})
                .get("wallpaper")
            )
            return wp, True

        # --- helper: read wallpaper from the chat_settings DB row --------
        def _read_db_wallpaper(dirpath):
            try:
                query = "SELECT wallpaper FROM chat_settings WHERE user_id = ?"
                rows = self._execute_query_in_path(
                    query, (self.current_user_id,), dirpath
                )
                if rows:
                    return rows[0][0], True
            except Exception:
                pass
            return None, False

        initial_path = getattr(self, "initial_state_path", None)

        # 1. If a final state_path was supplied, check it first.  When the
        #    final rootstore already contains the target wallpaper AND the
        #    initial state has the same value, the scenario is trivial.
        if state_path and initial_path:
            final_wp, final_found = _read_rootstore_wallpaper(state_path)
            if final_found and self._wallpaper_matches(final_wp, wp_key):
                # The final state already has the target wallpaper.
                # Check whether the initial state has the *same* value.
                init_wp, init_found = _read_rootstore_wallpaper(initial_path)
                if init_found and self._wallpaper_matches(init_wp, wp_key):
                    logger.debug(
                        "Rootstore wallpaper already matches target in "
                        "both initial (%r) and final (%r) state",
                        init_wp, final_wp,
                    )
                    return False

                # Also compare via DB
                final_db_wp, final_db_found = _read_db_wallpaper(state_path)
                if final_db_found and self._wallpaper_matches(final_db_wp, wp_key):
                    init_db_wp, init_db_found = _read_db_wallpaper(initial_path)
                    if init_db_found and self._wallpaper_matches(init_db_wp, wp_key):
                        logger.debug(
                            "DB wallpaper already matches target in "
                            "both initial (%r) and final (%r) state",
                            init_db_wp, final_db_wp,
                        )
                        return False

        # 2. Fall back to the original check against initial_state_path
        #    (or state_path when initial_state_path is unavailable).
        check_path = initial_path or state_path
        if check_path:
            init_wp, init_found = _read_rootstore_wallpaper(check_path)
            if init_found and self._wallpaper_matches(init_wp, wp_key):
                return False

            init_db_wp, init_db_found = _read_db_wallpaper(check_path)
            if init_db_found and self._wallpaper_matches(init_db_wp, wp_key):
                return False

        return True
