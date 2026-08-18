# Copyright (c) Meta Platforms, Inc. and affiliates.
import datetime
import json
import logging
import os
import shutil
import sqlite3
import subprocess
import time
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Optional

from .backends import EmulatorBackend, ADBBackend, GenymotionBackend


DB_FILE = "app_state.db"
DEFAULT_GENYMOTION_CONFIG = os.path.join("config", "genymotion_defaults.json")

# Parallel workers used when pushing the assets folder to the device.
# Benchmark across 55 profiles (5/8/12 workers) showed 8 workers wins 42 % of
# profiles and is the most consistent across tiny, medium and large asset sets.
ASSETS_PUSH_WORKERS = 8

# Wall-clock budget for a single file pull off the device, retries included.
# A pull fails almost exclusively because the app has not written the file yet,
# and waiting longer than this has never been observed to help -- it only
# starves the caller's own retry, which is what recovers.
PULL_TIMEOUT_SECONDS = float(os.environ.get("DIGIWORLD_PULL_TIMEOUT", "45"))

COLORS = {
    "reset": "\033[0m",
    "cyan": "\033[96m",
    "magenta": "\033[95m",
    "green": "\033[92m",
    "red": "\033[91m",
    "yellow": "\033[93m",
    "bold": "\033[1m",
}


logger = logging.getLogger(__name__)
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[ADB] %(message)s"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)
    logger.propagate = False


class ADBActions:
    """Backend-aware actions manager retaining full v1 functionality."""

    SESSION_FILES = ["id.db", "rootstore.json"]

    @staticmethod
    def _build_app_config() -> dict:
        """Build app config from discovered per-app configs."""
        from digiworld.config.discovery import get_all_app_configs

        result = {}
        for _app_name, mod in get_all_app_configs().items():
            bundle_id = getattr(mod, "BUNDLE_ID", "")
            if not bundle_id:
                continue

            table_configs = getattr(mod, "TABLE_CONFIGS", [])
            mockdata_files = list(dict.fromkeys(
                tc.source_file for tc in table_configs
            ))

            extra_files = getattr(mod, "EXTRA_MOCKDATA_FILES", [])
            for f in extra_files:
                if f not in mockdata_files:
                    mockdata_files.append(f)

            result[bundle_id] = {
                "mockdata_files": mockdata_files,
                "session_files": ADBActions.SESSION_FILES,
                "deeplink_format": getattr(mod, "DEEPLINK_FORMAT", None),
            }
        return result

    @staticmethod
    def _load_genymotion_defaults(config_file: Optional[str] = None) -> Dict[str, int]:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        search_path = config_file or os.path.join(script_dir, DEFAULT_GENYMOTION_CONFIG)
        if os.path.exists(search_path):
            with open(search_path, "r", encoding="utf-8") as fp:
                return json.load(fp)
        return {}

    def __init__(
        self,
        bundle_id: str,
        backend: Optional[EmulatorBackend] = None,
        custom_path: Optional[str] = None,
        config_file: Optional[str] = None,
        genymotion_config_file: Optional[str] = None,
    ):
        self.bundle_id = bundle_id
        self.config_file_name = "app_state.json"
        self.use_colors = True
        self.current_data_id: Optional[str] = None
        self.current_session_id: Optional[str] = None
        # Which profile's assets/ folder is currently on device.
        # Set after a successful push; prevents re-pushing on every reset.
        self._active_asset_profile: Optional[str] = None
        self.device_base_path = f"/storage/emulated/0/Android/data/{bundle_id}/files"
        self.script_dir = os.path.dirname(os.path.abspath(__file__))
        self.data_dir = os.path.join(self.script_dir, "data", self.bundle_id)

        self.backend = backend or ADBBackend()
        if isinstance(self.backend, GenymotionBackend):
            defaults = self._load_genymotion_defaults(genymotion_config_file)
            if defaults:
                self.backend.set_timeouts(
                    shell_timeout=defaults.get("shell_timeout"),
                    file_transfer_timeout=defaults.get("file_transfer_timeout"),
                    install_timeout=defaults.get("install_timeout"),
                )

        self.appConfig = self._build_app_config()
        if bundle_id not in self.appConfig:
            raise ValueError(
                f"No configuration found for bundle ID: {bundle_id}. "
                f"Available apps: {', '.join(sorted(self.appConfig.keys()))}"
            )

        config = self.appConfig[bundle_id]
        self.mockdata_files = config.get("mockdata_files", [])
        self.session_files = config.get("session_files", self.SESSION_FILES)
        self.deeplink_format = config.get("deeplink_format")
        if not self.deeplink_format:
            raise ValueError(
                f"Missing deeplink_format for bundle ID: {bundle_id}. "
                f"Please check the config file."
            )

        self.custom_path = custom_path
        self.backup_dir = (
            os.path.join(custom_path, bundle_id)
            if custom_path
            else os.path.join(self.script_dir, "backup", bundle_id)
        )

        os.makedirs(self.backup_dir, exist_ok=True)
        for i in range(1, 11):
            env_path = os.path.join(self.backup_dir, f"test-profile-{i}", "mockdata")
            os.makedirs(env_path, mode=0o755, exist_ok=True)

        logger.info("Created test profile directories at %s", self.backup_dir)
        # Only copy test data when no custom_path is provided.
        # When custom_path is set (e.g., digiworld's state_data), it's the canonical source
        # and should not be overwritten by the debug data in data/.
        if not custom_path:
            self.copy_test_data()
        logger.info("ADBActions set up for [%s]", bundle_id)

    def copy_test_data(self):
        for i in range(1, 11):
            profile_name = f"test-profile-{i}"
            source_profile = os.path.join(self.data_dir, profile_name)
            dest_profile = os.path.join(self.backup_dir, profile_name)

            source_mockdata = os.path.join(source_profile, "mockdata")
            dest_mockdata = os.path.join(dest_profile, "mockdata")
            if os.path.exists(source_mockdata) and os.listdir(source_mockdata):
                shutil.copytree(source_mockdata, dest_mockdata, dirs_exist_ok=True)
                logger.info("Copied mockdata for %s", profile_name)

            source_sessions = os.path.join(source_profile, "sessions")
            dest_sessions = os.path.join(dest_profile, "sessions")
            if os.path.exists(source_sessions) and os.listdir(source_sessions):
                shutil.copytree(source_sessions, dest_sessions, dirs_exist_ok=True)
                logger.info("Copied all sessions for %s", profile_name)

            # Copy theme.json file if exists
            source_theme = os.path.join(source_profile, "theme.json")
            dest_theme = os.path.join(dest_profile, "theme.json")
            if os.path.exists(source_theme):
                shutil.copy2(source_theme, dest_theme)
                print(f"✅ Copied theme.json for {profile_name}")

        self.init_db()

    def _check_env_set(self):
        if self.current_data_id is None:
            raise ValueError("❌ Environment not set. Please call set_environment first.")

    def dispatch_deeplink_to_android(self, action: str, session_id: Optional[str] = None, skip_initial_wait: bool = False):
        """
        Triggers a deep link to notify the app of an action.
        OPTIMIZED: Added skip_initial_wait parameter to avoid redundant waits.
        """
        # Only check for environment if action is not reset, cleanup, append, dbrefresh, or load-theme
        if action not in ["reset", "cleanup", "append", "dbrefresh", "load-theme"]:
            self._check_env_set()

        if not self.deeplink_format:
            raise ValueError(f"❌ No deep link format defined for {self.bundle_id}")

        try:
            if not skip_initial_wait:
                self.wait_for_ready()

            # Always use empty string for None — passing None would format
            # as the literal "None" string in the deeplink URL.
            safe_session_id = session_id if session_id is not None else ""
            deeplink = self.deeplink_format.format(
                session_id=safe_session_id, action=action
            )

            shell_command = (
                f'am start -W -a android.intent.action.VIEW -d "{deeplink}" {self.bundle_id}'
            )
            self.backend.execute_command(shell_command, is_shell=True)
            logger.info("Triggered deep link: %s", deeplink)

            if action == "append":
                logger.info("Waiting for app to finish processing append...")
                self.wait_for_ready()
                self.backup_current_db_only()
            elif action == "dbrefresh":
                self.wait_for_ready()
            else:
                self.extract_session_report()
        except Exception as exc:
            logger.error("Error triggering deep link %s: %s", action, exc)
            raise

    def persist_state(self, use_default_session: bool = False) -> str:
        self._check_env_set()
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            session_id = "default" if use_default_session else str(uuid.uuid4())
            try:
                self.dispatch_deeplink_to_android(action="get", session_id=session_id)
                self.wait_for_ready()
                self.backup_app_data(session_id)
                return session_id
            except Exception:
                if attempt >= max_attempts:
                    raise
                logger.warning(
                    "persist_state attempt %d/%d failed, retrying with new session...",
                    attempt, max_attempts,
                )
                time.sleep(3)
        return session_id  # unreachable, but keeps type checkers happy

    def get_db_to_modify(self, session_id: Optional[str] = None) -> bool:
        """Tell the app to prepare its DB for external modification.

        This sends an ``append`` deep link so the app backs up its current
        state and makes the DB available under ``db-forge/``.  Unlike the
        generic ``dispatch_deeplink_to_android(action="append")``, this
        method intentionally skips the subsequent ``backup_current_db_only``
        round-trip (which triggers an extra ``dbrefresh`` deep link).  That
        extra cycle is only useful for the standalone append workflow; when
        called from ``MockdataHandler.handle_mockdata`` the caller does its
        own pull → merge → push → dbrefresh cycle, making the intermediate
        one redundant and potentially harmful (some apps show a
        'session not found' alert on the intermediate dbrefresh).
        """
        try:
            if not session_id:
                session_id = f"append_{int(time.time() * 1000)}"

            self.current_session_id = session_id
            logger.info("Starting database modification process for session %s", session_id)

            # Send the append deep link directly (no backup_current_db_only)
            self.wait_for_ready()
            deeplink = self.deeplink_format.format(
                session_id=session_id, action="append"
            )
            shell_command = (
                f'am start -W -a android.intent.action.VIEW '
                f'-d "{deeplink}" {self.bundle_id}'
            )
            self.backend.execute_command(shell_command, is_shell=True)
            logger.info("Triggered append deep link: %s", deeplink)

            # Wait for the app to finish processing the append
            self.wait_for_ready()
            return True
        except Exception as exc:
            logger.error("Error in get_db_to_modify: %s", exc)
            return False

    def rollback_state(
        self, session_id: str, rootstore_override: Optional[str] = None
    ) -> str:
        self._check_env_set()
        logger.info("Starting rollback for session %s...", session_id)

        mockdata_dir = f"{self.device_base_path}/mockdata"
        missing_files = [
            filename
            for filename in self.mockdata_files
            if not self.backend.file_exists(f"{mockdata_dir}/{filename}")
        ]
        if missing_files:
            # Warn but continue — EXTRA_MOCKDATA_FILES may not exist
            # in the base profile's mockdata directory.
            logger.warning(
                "Some mockdata files not on device: %s (may be scenario-only files)",
                ", ".join(missing_files),
            )

        logger.debug("Restoring session data...")
        if not self.restore_app_data(session_id):
            logger.error("Failed to restore session data for session %s", session_id)
            return "failed"

        # If a rootstore override was provided, push it on top of the
        # one that restore_app_data() already placed.  This enables
        # runtime UI-state selection without variant directories.
        if rootstore_override and os.path.exists(rootstore_override):
            remote_rootstore = (
                f"{self.device_base_path}/sessions/{session_id}/rootstore.json"
            )
            try:
                self.backend.push_file(rootstore_override, remote_rootstore)
                logger.info(
                    "Pushed rootstore override: %s -> %s",
                    rootstore_override,
                    remote_rootstore,
                )
            except Exception as exc:
                logger.warning("Failed to push rootstore override: %s", exc)

        # Ensure pushed files are flushed to disk on the emulator before
        # dispatching the deep link that reads them.
        try:
            self.backend.execute_command("sync", is_shell=True)
        except Exception:
            pass

        try:
            logger.debug("Waiting for app to be ready...")
            self.wait_for_ready()
            logger.debug("Applying session state...")
            self.dispatch_deeplink_to_android(action="set", session_id=session_id)
            logger.info("Rollback completed successfully for session %s", session_id)
            return "success"
        except Exception as exc:
            logger.error("Error during rollback: %s", exc)
            return "failed"

    # ------------------------------------------------------------------
    # Append & database forge workflow
    # ------------------------------------------------------------------
    def backup_current_db_only(self, backup_location: Optional[str] = None):
        logger.info("Fetching current database and rootstore...")
        if backup_location is None:
            currentdb_path = os.path.join(
                self.script_dir, "data", self.bundle_id, "db-forge"
            )
        else:
            currentdb_path = backup_location

        os.makedirs(currentdb_path, exist_ok=True)

        modified_db_path = os.path.join(currentdb_path, "modify.db")
        if os.path.exists(modified_db_path):
            os.remove(modified_db_path)
            logger.debug("Deleted existing modify.db")

        current_db_path = os.path.join(currentdb_path, "current.db")
        if os.path.exists(current_db_path):
            os.remove(current_db_path)
            logger.debug("Deleted existing current.db")

        current_json_path = os.path.join(currentdb_path, "current.json")
        if os.path.exists(current_json_path):
            os.remove(current_json_path)
            logger.debug("Deleted existing current.json")

        remote_db_path = f"{self.device_base_path}/db-forge/current.db"
        remote_json_path = f"{self.device_base_path}/db-forge/current.json"

        self._pull_with_retries(
            remote_path=remote_db_path,
            local_path=current_db_path,
            validate_fn=self._validate_sqlite_file,
            description="database",
        )

        self._pull_with_retries(
            remote_path=remote_json_path,
            local_path=current_json_path,
            validate_fn=self._validate_json_file,
            description="rootstore",
        )

        from .validator import DatabaseValidator
        db_validator = DatabaseValidator(self.bundle_id, self.appConfig[self.bundle_id])
        source_path = os.path.join(currentdb_path, "source")

        # Ensure source directory exists
        os.makedirs(source_path, exist_ok=True)
        logger.info("Source directory: %s", source_path)

        # Check for JSON files in source directory
        if os.path.exists(source_path):
            json_files = [f for f in os.listdir(source_path) if f.endswith('.json')]
            if json_files:
                logger.info("Found %d JSON file(s) in source directory: %s", len(json_files), json_files)
            else:
                logger.warning("⚠️ No JSON files found in source directory: %s", source_path)
                logger.warning("⚠️ Expected files matching: %s", self.mockdata_files)
                logger.warning("⚠️ Data append will copy current.db to modify.db without adding new data")

        max_attempts = 60
        attempt = 0
        while attempt < max_attempts:
            if db_validator.execute_data_append(current_db_path, modified_db_path, source_path):
                logger.info("Data append completed successfully")
                if os.path.exists(modified_db_path):
                    logger.info("Found modify.db, pushing to device...")
                    if self.push_modified_db_to_device(modified_db_path):
                        logger.info("Append workflow finished")
                        return
                    raise Exception("Failed to push modify.db to device")

            attempt += 1
            if attempt < max_attempts:
                logger.debug("Data append attempt %s failed, retrying in 1 second...", attempt)
                time.sleep(1)
            else:
                raise Exception(
                    f"Data append failed after {max_attempts} attempts (60 seconds)"
                )

    def push_modified_db_to_device(self, local_file_path: str) -> bool:
        try:
            remote_dir = f"{self.device_base_path}/db-forge/modified"
            self.backend.execute_command(f"mkdir -p {remote_dir}", is_shell=True)

            remote_file = f"{remote_dir}/modified.db"
            self.backend.push_file(local_file_path, remote_file)
            logger.info("Pushed modify.db to %s", remote_file)

            current_json_path = os.path.join(
                os.path.dirname(local_file_path),
                "current.json",
            )
            if os.path.exists(current_json_path):
                remote_json = f"{remote_dir}/current.json"
                self.backend.push_file(current_json_path, remote_json)
                logger.info("Pushed current.json to %s", remote_json)
            else:
                logger.warning("current.json not found at %s", current_json_path)

            # Push instance mockdata assets to the app's mockdata/assets/ folder
            # so the app can resolve image paths for newly appended records.
            # Currently enabled for eats only (com.andojoeats.sbx) — extend as needed.
            self._push_instance_assets_to_device(local_file_path)

            logger.info("Waiting for app to be ready after database push...")
            self.wait_for_ready()

            session_id_to_use = self.current_session_id or "default"
            logger.info(
                "Triggering dbrefresh for session %s after pushing modify.db",
                session_id_to_use,
            )
            self.dispatch_deeplink_to_android(action="dbrefresh", session_id=session_id_to_use)
            return True
        except Exception as exc:
            logger.error("Failed to push files to device: %s", exc)
            return False

    def _push_instance_assets_to_device(self, modify_db_path: str) -> None:
        """
        Push instance mockdata asset images (staged in db-forge/source/assets/)
        to the app's external storage at:
          {device_base_path}/mockdata/assets/{relative/path}

        Works for all apps and all folder patterns (flat, subfolder, prefixed):
          flat      →  assets/restaurants/90001.png
          subfolder →  assets/artists/90001/main.jpg
          prefixed  →  assets/avatars/avatar_90001.jpg

        Runs only when mockdata_handler has staged assets in db-forge/source/assets/
        (i.e. the active scenario instance has a mockdata/assets/ folder).
        """

        db_forge_dir = os.path.dirname(modify_db_path)
        source_assets_dir = os.path.join(db_forge_dir, "source", "assets")

        if not os.path.isdir(source_assets_dir):
            logger.debug("No source/assets directory found; skipping instance asset push")
            return

        image_exts = {".png", ".jpg", ".jpeg", ".webp"}
        remote_mockdata_assets = f"{self.device_base_path}/mockdata/assets"

        pushed = 0
        for root, _, files in os.walk(source_assets_dir):
            for fname in files:
                if os.path.splitext(fname)[1].lower() not in image_exts:
                    continue
                local_img = os.path.join(root, fname)
                rel = os.path.relpath(local_img, source_assets_dir)  # e.g. restaurants/90001.png
                remote_img = f"{remote_mockdata_assets}/{rel}"
                remote_img_dir = remote_img.rsplit("/", 1)[0]
                self.backend.execute_command(f"mkdir -p {remote_img_dir}", is_shell=True)
                self.backend.push_file(local_img, remote_img)
                logger.info("Pushed asset %s → %s", rel, remote_img)
                pushed += 1

        if pushed:
            logger.info("Pushed %d instance asset image(s) to device mockdata/assets/", pushed)
        else:
            logger.debug("source/assets exists but contained no image files")

    def push_modified_db(self, timestamp: Optional[str] = None) -> bool:
        if not isinstance(self.backend, ADBBackend):
            raise NotImplementedError(
                "push_modified_db is currently supported only with the ADB backend"
            )

        modifieddb_path = os.path.join(
            self.script_dir, "data", self.bundle_id, "db-forge", "modifieddb"
        )

        if not os.path.exists(modifieddb_path):
            logger.error("Modified database directory not found: %s", modifieddb_path)
            return False

        modified_files = [
            f
            for f in os.listdir(modifieddb_path)
            if f.startswith("modified_db_") and f.endswith(".db")
        ]
        if not modified_files:
            logger.error("No modified database files found in %s", modifieddb_path)
            return False

        if timestamp:
                target_file = f"modified_db_{timestamp}.db"
                if target_file not in modified_files:
                    logger.error("Modified database with timestamp %s not found", timestamp)
                    return False
        else:
            target_file = max(
                modified_files, key=lambda name: int(name.split("_")[-1].split(".")[0])
            )

            local_file_path = os.path.join(modifieddb_path, target_file)

            remote_dir = f"/data/user/0/{self.bundle_id}/files/db-forge/modified"
        create_dir_cmd = [
            "adb",
            "exec-out",
            "run-as",
            self.bundle_id,
            "mkdir",
            "-p",
            remote_dir,
        ]

        try:
            subprocess.run(create_dir_cmd, check=True)
            remote_file_path = f"{remote_dir}/{target_file}"
            push_cmd = [
                "adb",
                "exec-out",
                "run-as",
                self.bundle_id,
                "sh",
                "-c",
                f"cat > {remote_file_path}",
            ]

            with open(local_file_path, "rb") as file_handle:
                subprocess.run(push_cmd, stdin=file_handle, check=True)

            logger.info("Successfully pushed modified database %s", target_file)
            return True
        except Exception as exc:
            logger.error("Error pushing modified database: %s", exc)
            return False

    # ------------------------------------------------------------------
    # Backup & restore
    # ------------------------------------------------------------------
    def backup_app_data(self, session_id: str, backup_location: Optional[str] = None):
        self._check_env_set()

        if backup_location is None:
            session_path = os.path.join(
                self.backup_dir, self.current_data_id, "sessions", session_id
            )
        else:
            session_path = os.path.join(
                backup_location, self.current_data_id, "sessions", session_id
            )

        os.makedirs(session_path, exist_ok=True)
        logger.info(
            "Taking backup for session %s in data profile %s...",
            session_id,
            self.current_data_id,
        )

        for filename in self.session_files:
            self._pull_with_retries(
                remote_path=self._resolve_session_remote_path(session_id, filename),
                local_path=os.path.join(
                    session_path,
                    f"{session_id}.db" if filename.endswith(".db") else filename,
                ),
                description=filename,
                        )

    def restore_app_data(
        self, session_id: str, replace: bool = True, backup_location: Optional[str] = None
    ) -> bool:
        self._check_env_set()

        if backup_location is None:
            session_path = os.path.join(
                self.backup_dir, self.current_data_id, "sessions", session_id
            )
        else:
            session_path = os.path.join(
                backup_location, self.current_data_id, "sessions", session_id
            )

        if not os.path.exists(session_path):
            logger.error(
                "No backup found for session %s in data profile %s",
                session_id,
                self.current_data_id,
            )
            return False

        logger.info(
            "Restoring session %s data from profile %s...",
            session_id,
            self.current_data_id,
        )

        try:
            self.backend.execute_command(
                f"mkdir -p {self.device_base_path}/sessions/{session_id}", is_shell=True
            )
        except Exception as exc:
            logger.error("Failed to create remote session directory: %s", exc)
            return False

        success = True
        for filename in self.session_files:
            if filename.endswith(".db"):
                local_file = os.path.join(session_path, f"{session_id}.db")
                remote_file = (
                    f"{self.device_base_path}/sessions/{session_id}/{session_id}.db"
                )
            else:
                local_file = os.path.join(session_path, filename)
                remote_file = f"{self.device_base_path}/sessions/{session_id}/{filename}"

            if not os.path.exists(local_file):
                logger.warning("%s missing in backup. Skipping...", filename)
                success = False
                continue

            try:
                self.backend.push_file(local_file, remote_file)
                logger.debug("Restored %s to %s", filename, remote_file)
                # Remove WAL/SHM files for DB files to prevent stale data
                # from being replayed on top of the clean backup
                if filename.endswith(".db"):
                    for ext in ["-wal", "-shm"]:
                        wal_path = f"{remote_file}{ext}"
                        try:
                            self.backend.execute_command(
                                f"rm -f {wal_path}", is_shell=True
                            )
                        except Exception:
                            pass
            except Exception as exc:
                logger.error("Failed to restore %s: %s", filename, exc)
                success = False

        if success:
                logger.info(
                "Restore complete for session %s from data profile %s.",
                session_id,
                self.current_data_id,
                )
        else:
                logger.warning(
                "Restore completed with some errors for session %s.", session_id
            )

        return success

    # ------------------------------------------------------------------
    # Parallel assets push
    # ------------------------------------------------------------------
    def _push_assets_parallel(
        self,
        assets_path: str,
        mockdata_path: str,
        workers: int = ASSETS_PUSH_WORKERS,
    ) -> None:
        """Push every file under *assets_path* to the device in parallel.

        Remote directory structure is created first (sequential mkdir -p calls
        are fast and must finish before any push targets them), then all files
        are pushed concurrently using *workers* threads.

        Benchmark recommendation: 5 workers wins 5/6 apps; use 12 only for
        Eats-like workloads with very small files (< 120 KB avg).
        """
        push_pairs: List[tuple] = []
        seen_dirs: set = set()

        for root, _, files in os.walk(assets_path):
            if not files:
                continue
            rel_dir = os.path.relpath(root, mockdata_path)
            target_dir = os.path.join(
                self.device_base_path, "mockdata", rel_dir
            ).replace("\\", "/")

            if target_dir not in seen_dirs:
                self.backend.execute_command(
                    f'mkdir -p "{target_dir}"', is_shell=True
                )
                seen_dirs.add(target_dir)

            for file in files:
                local_file  = os.path.join(root, file)
                remote_file = f"{target_dir}/{file}"
                push_pairs.append((local_file, remote_file))

        if not push_pairs:
            return

        logger.debug(
            "Pushing %d asset file(s) with %d workers...",
            len(push_pairs),
            workers,
        )

        def _push_one(pair):
            local, remote = pair
            self.backend.push_file(local, remote)
            return os.path.relpath(local, assets_path)

        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(_push_one, p): p for p in push_pairs}
            for fut in as_completed(futures):
                try:
                    rel = fut.result()
                    logger.debug("   Pushed asset: %s", rel)
                except Exception as exc:
                    local, remote = futures[fut]
                    logger.warning(
                        "   Failed to push asset %s → %s: %s",
                        os.path.basename(local), remote, exc,
                    )

    def _push_assets_zip(self, assets_path: str, mockdata_path: str) -> None:
        """Zip assets on host → push single file → unzip on device → cleanup.

        Eliminates per-file ADB handshake overhead.  Measured ~3× faster than
        raw parallel push for 5K+ files (see asset_transfer_guide.md).

        Uses ZIP_STORED (no compression) — JPEGs/PNGs are already compressed
        so adding deflate would waste CPU without reducing size.

        Requires ``unzip`` on the device (present on all standard AOSP images).
        """
        import tempfile
        import zipfile
        import time as _time

        staging_dir = f"{self.device_base_path}/staging"
        remote_zip  = f"{staging_dir}/assets.zip"

        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".zip")
        os.close(tmp_fd)

        try:
            # 1. Build zip on host (ZIP_STORED — fast, no wasted compression)
            t0 = _time.time()
            logger.info("Building zip archive (ZIP_STORED)...")
            with zipfile.ZipFile(tmp_path, "w", compression=zipfile.ZIP_STORED) as zf:
                for root, _, files in os.walk(assets_path):
                    for file in files:
                        full = os.path.join(root, file)
                        # arcname preserves 'assets/subdir/file' structure
                        # so unzip into mockdata/ recreates mockdata/assets/...
                        arcname = os.path.relpath(full, mockdata_path)
                        zf.write(full, arcname)
            zip_mb = os.path.getsize(tmp_path) / 1_048_576
            logger.info(
                "Zip ready: %.1f MB in %.1fs", zip_mb, _time.time() - t0
            )

            # 2. Push the single zip file
            self.backend.execute_command(f"mkdir -p {staging_dir}", is_shell=True)
            t0 = _time.time()
            logger.info("Pushing zip to device...")
            self.backend.push_file(tmp_path, remote_zip)
            logger.info("Zip pushed in %.1fs", _time.time() - t0)

            # 3. Unzip on device into mockdata/
            mockdata_device = f"{self.device_base_path}/mockdata"
            self.backend.execute_command(
                f"mkdir -p {mockdata_device}", is_shell=True
            )
            t0 = _time.time()
            logger.info("Unzipping on device...")
            self.backend.execute_command(
                f"unzip -qo {remote_zip} -d {mockdata_device}", is_shell=True
            )
            logger.info("Unzip done in %.1fs", _time.time() - t0)

        finally:
            # 4. Clean up staging zip on device and temp file on host
            try:
                self.backend.execute_command(f"rm -f {remote_zip}", is_shell=True)
            except Exception:
                pass
            os.unlink(tmp_path)

    # ------------------------------------------------------------------
    # Asset profile marker — persists the active profile across restarts
    # ------------------------------------------------------------------
    _ASSET_MARKER_PATH_TPL = "{base}/.asset_profile_marker"

    def _read_asset_profile_marker(self) -> Optional[str]:
        """Return the data_id stored in the device marker, or None."""
        marker = self._ASSET_MARKER_PATH_TPL.format(base=self.device_base_path)
        try:
            content = self.backend.read_file(marker)
            return content.strip() if content else None
        except Exception:
            return None

    def _write_asset_profile_marker(self, data_id: str) -> None:
        """Persist data_id to the device so future instances can skip the push."""
        marker = self._ASSET_MARKER_PATH_TPL.format(base=self.device_base_path)
        try:
            self.backend.execute_command(
                f"echo '{data_id}' > {marker}", is_shell=True
            )
        except Exception as exc:
            logger.warning("Failed to write asset profile marker: %s", exc)

    def _resolve_active_asset_profile(self, data_id: str) -> Optional[str]:
        """Return skip reason ("memory"|"marker") or None if push is needed."""
        if self._active_asset_profile == data_id:
            return "memory"
        if self._active_asset_profile is None:
            on_device = self._read_asset_profile_marker()
            if on_device == data_id:
                self._active_asset_profile = data_id
                return "marker"
        return None

    # File-count threshold above which zip beats parallel.
    # Source: asset_transfer_guide.md — measured ~3× speedup at 5K files.
    _ZIP_THRESHOLD = 5_000

    def _resolve_asset_method(
        self, assets_path: str, method: str, workers: int
    ) -> tuple:
        """Return the effective (method, workers) pair for an asset push.

        When *method* is ``"auto"`` (the default), the file count under
        *assets_path* is compared against ``_ZIP_THRESHOLD``:
        - ≤ 5 K files  → ``("parallel", workers)``  (raw adb push, fast enough)
        - > 5 K files  → ``("zip", workers)``        (zip→push→unzip, ~3× faster)

        Manual overrides (``"parallel"`` / ``"zip"``) are passed through
        unchanged so callers can always opt out of the heuristic.
        """
        if method != "auto":
            return method, workers

        file_count = sum(len(files) for _, _, files in os.walk(assets_path))
        chosen = "zip" if file_count > self._ZIP_THRESHOLD else "parallel"
        logger.info(
            "Auto method: %d files detected → using %s "
            "(threshold %d; see asset_transfer_guide.md)",
            file_count,
            chosen,
            self._ZIP_THRESHOLD,
        )
        return chosen, workers

    def push_app_assets(
        self,
        data_id: str,
        base_path: Optional[str] = None,
        force: bool = False,
        method: str = "auto",
        workers: int = 5,
    ) -> bool:
        """Push only the multimedia assets/ folder (images, videos) to device.

        This is the expensive one-time step per profile.  Call it once when
        the emulator starts (or when switching to a new profile).  Subsequent
        calls for the same ``data_id`` are skipped via the in-memory /
        device-marker guard, so re-calling is safe.

        JSON and .db files are handled by ``set_environment`` on every reset.

        Args:
            data_id: Base profile name (e.g. ``"default"``).
            base_path: Optional root directory override.
            force: Bypass the guard and always push (use when emulator was wiped).
            method: Transfer strategy.
                - ``"auto"`` *(default)* — picks ``"parallel"`` for ≤ 5 K files
                  and ``"zip"`` above that (based on asset_transfer_guide.md
                  benchmarks).
                - ``"parallel"`` — raw adb push with *workers* threads.
                - ``"zip"`` — zip → push → unzip; ~3× faster for large sets.
            workers: Thread count for ``"parallel"`` / ``"auto"`` → parallel
                branch. **5 recommended** for most apps (wins 5/6 in benchmarks);
                use 12 only for Eats-like workloads (very small files).
        """
        try:
            resolved_base = base_path or self.backup_dir
            mockdata_dir = os.path.join(resolved_base, data_id, "mockdata")
            assets_path = os.path.join(mockdata_dir, "assets")

            if not os.path.isdir(assets_path):
                logger.info(
                    "No assets/ folder for profile [%s] — nothing to push", data_id
                )
                self.current_data_id = data_id
                return True

            skip_reason = None if force else self._resolve_active_asset_profile(data_id)
            if skip_reason == "memory":
                logger.info(
                    "Assets for [%s] already pushed this session — skipping", data_id
                )
            elif skip_reason == "marker":
                logger.info(
                    "Assets for [%s] were pushed in a previous session "
                    "(device marker present) — skipping. "
                    "Pass force=True if the emulator was wiped.",
                    data_id,
                )
            else:
                effective_method, effective_workers = self._resolve_asset_method(
                    assets_path, method, workers
                )

                if effective_method == "zip":
                    logger.info(
                        "Pushing multimedia assets/ for profile [%s] (zip)...",
                        data_id,
                    )
                    self._push_assets_zip(assets_path, mockdata_dir)
                else:
                    logger.info(
                        "Pushing multimedia assets/ for profile [%s] "
                        "(parallel, %d workers)...",
                        data_id,
                        effective_workers,
                    )
                    self._push_assets_parallel(
                        assets_path, mockdata_dir, workers=effective_workers
                    )

                self._active_asset_profile = data_id
                self._write_asset_profile_marker(data_id)
                logger.info("Multimedia assets pushed for profile [%s]", data_id)

                # Restart the app so it picks up the newly pushed files.
                # Android apps cache asset paths in memory from launch; a
                # force-stop + restart is the only reliable way to reload them
                # without requiring app-side support for a reload deeplink.
                logger.info(
                    "Restarting app so it reads newly pushed assets from disk..."
                )
                self.backend.execute_command(
                    f"am force-stop {self.bundle_id}", is_shell=True
                )
                time.sleep(1)
                self.backend.execute_command(
                    f"monkey -p {self.bundle_id} "
                    f"-c android.intent.category.LAUNCHER 1",
                    is_shell=True,
                )
                self.wait_for_ready(max_wait_time=30)
                logger.info("App restarted — assets are now visible")

            self.current_data_id = data_id
            return True
        except Exception as exc:
            logger.error("Error in push_app_assets: %s", exc)
            return False

    def set_environment(
        self,
        data_id: str,
        mockdata_path: Optional[str] = None,
        wait_for_ready: bool = False,
        session_id: Optional[str] = None,
        theme_override: Optional[str] = None,
        rootstore_override: Optional[str] = None,
    ) -> bool:
        """Push profile data to device and restore a session.

        Args:
            data_id: Base profile name (e.g. ``"default"``).
            mockdata_path: Optional base path override for mockdata.
            wait_for_ready: Wait before sending reset deeplink.
            session_id: Specific session to restore (default: ``"default"``).
            theme_override: Path to a theme JSON file to push instead of
                the profile's own ``theme.json``.  Enables runtime theme
                selection without materialised variant directories.
            rootstore_override: Path to a rootstore JSON file to push
                instead of the session's ``rootstore.json``.  Enables
                runtime UI-state selection without variant directories.
        """
        try:
            self.current_data_id = data_id
            base_path = mockdata_path or self.backup_dir
            mockdata_path = os.path.join(base_path, data_id, "mockdata")
            sessions_path = os.path.join(base_path, data_id, "sessions")

            if not os.path.exists(mockdata_path):
                logger.error("Mock data directory not found: %s", mockdata_path)
                return False

            missing_files = [
                f
                for f in self.mockdata_files
                if not os.path.exists(os.path.join(mockdata_path, f))
            ]
            if missing_files:
                # Only warn — EXTRA_MOCKDATA_FILES exist only in scenario
                # instance mockdata, not in the base profile.
                logger.warning(
                    "Some mockdata files not in profile: %s (will be skipped)",
                    ", ".join(missing_files),
                )

            self.backend.execute_command(
                f"mkdir -p {self.device_base_path}/mockdata", is_shell=True
            )
            available_files = [
                f for f in self.mockdata_files
                if os.path.exists(os.path.join(mockdata_path, f))
            ]
            for filename in available_files:
                local_file = os.path.join(mockdata_path, filename)
                remote_file = f"{self.device_base_path}/mockdata/{filename}"
                self.backend.push_file(local_file, remote_file)
                logger.debug("Pushed %s", filename)

            # Multimedia assets (images/videos) are NOT pushed here.
            # Call push_app_assets() / the "Load Assets" button once at
            # emulator startup to push them independently.

            # Push theme.json — use override path if provided, else profile's own
            theme_file_path = theme_override or os.path.join(base_path, data_id, "theme.json")
            theme_pushed = False
            if os.path.exists(theme_file_path):
                logger.info("Pushing theme from %s", theme_file_path)
                theme_dir = f"{self.device_base_path}/themes"
                self.backend.execute_command(f"mkdir -p {theme_dir}", is_shell=True)
                remote_theme_path = f"{theme_dir}/theme.json"
                try:
                    self.backend.push_file(theme_file_path, remote_theme_path)
                    logger.info("Theme pushed to device: %s", remote_theme_path)
                    theme_pushed = True
                except Exception as theme_exc:
                    logger.warning("Failed to push theme: %s", theme_exc)
            else:
                logger.info("No theme.json found at %s - skipping theme push", theme_file_path)

            if theme_pushed:
                self.wait_for_ready(max_wait_time=30)
                self.dispatch_deeplink_to_android(
                    action="load-theme",
                    session_id=session_id or data_id,
                    skip_initial_wait=True,
                )

            if session_id:
                session_path = os.path.join(sessions_path, session_id)
                if os.path.exists(session_path):
                    if self.rollback_state(session_id, rootstore_override=rootstore_override) == "success":
                        logger.info("Rolled back to session %s", session_id)
                        return True
                    logger.error("Failed to rollback to session %s", session_id)
                    return False
                logger.warning("Session %s not found at %s", session_id, session_path)

            default_path = os.path.join(sessions_path, "default")
            if os.path.exists(default_path):
                if self.rollback_state("default", rootstore_override=rootstore_override) == "success":
                    logger.info("Rolled back to default session")
                    return True
                logger.error("Failed to rollback to default session")
                return False

            logger.info("No valid sessions found, triggering reset")
            if wait_for_ready:
                self.wait_for_ready()
            self.dispatch_deeplink_to_android(action="reset", session_id=None)
            return True
        except Exception as exc:
            logger.error("Error in set_environment: %s", exc)
            return False

    def clear(self):
        self.dispatch_deeplink_to_android(action="cleanup", session_id=None)
        logger.info("Cleanup triggered successfully")

    def is_ready(self) -> Dict[str, Any]:
        remote_file = f"{self.device_base_path}/{self.config_file_name}"
        try:
            contents = self.backend.read_file(remote_file)
            if contents:
                return json.loads(contents)
            logger.warning("App state file %s empty or missing", remote_file)
            return {"isAppReady": False}
        except json.JSONDecodeError as json_exc:
            logger.error("Failed to decode JSON from %s: %s", remote_file, json_exc)
            return {"isAppReady": False}
        except Exception as exc:
            logger.error("Error reading app state from %s: %s", remote_file, exc)
            return {"isAppReady": False}

    def reset(self, wait_for_ready: bool = True):
        try:
            if wait_for_ready:
                readiness_status = self.wait_for_ready()
                if not readiness_status.get("isAppReady"):
                    raise Exception("App is not ready to reset.")

            deeplink = self.deeplink_format.format(session_id=None, action="reset")
            shell_command = (
                f'am start -W -a android.intent.action.VIEW -d "{deeplink}" {self.bundle_id}'
            )
            self.backend.execute_command(shell_command, is_shell=True)
            logger.info("App has been reset")
        except Exception as exc:
            logger.error("Error triggering reset deep link: %s", exc)

    def load_data(self, data_id: str, mockdata_path: Optional[str] = None, wait_for_ready: bool = True) -> bool:
        try:
            self.current_data_id = data_id
            base_path = mockdata_path or self.backup_dir
            mockdata_path = os.path.join(base_path, data_id, "mockdata")

            if not os.path.exists(mockdata_path):
                logger.error("Mock data directory not found: %s", mockdata_path)
                return False

            missing_files = [
                f
                for f in self.mockdata_files
                if not os.path.exists(os.path.join(mockdata_path, f))
            ]
            if missing_files:
                logger.error("Missing required files: %s", ", ".join(missing_files))
                return False

            self.backend.execute_command(
                f"mkdir -p {self.device_base_path}/mockdata", is_shell=True
            )

            for filename in self.mockdata_files:
                local_file = os.path.join(mockdata_path, filename)
                remote_file = f"{self.device_base_path}/mockdata/{filename}"
                self.backend.push_file(local_file, remote_file)
                logger.debug("Pushed %s", filename)

            assets_path = os.path.join(mockdata_path, "assets")
            if os.path.exists(assets_path) and os.path.isdir(assets_path):
                logger.debug("Pushing assets folder (%d workers)...", ASSETS_PUSH_WORKERS)
                self._push_assets_parallel(assets_path, mockdata_path)
            else:
                logger.debug("No assets folder found in mockdata path")

            # Push theme.json if exists in the test-profile folder
            theme_file_path = os.path.join(base_path, data_id, "theme.json")
            theme_pushed = False
            if os.path.exists(theme_file_path):
                print("🎨 Pushing theme.json from test profile...")
                theme_dir = f"{self.device_base_path}/themes"
                self.backend.execute_command(f"mkdir -p {theme_dir}", is_shell=True)
                remote_theme_path = f"{theme_dir}/theme.json"
                try:
                    self.backend.push_file(theme_file_path, remote_theme_path)
                    print(f"✅ Theme pushed to device: {remote_theme_path}")
                    theme_pushed = True
                except Exception as theme_exc:
                    print(f"⚠️ Failed to push theme: {theme_exc}")
            else:
                print(f"ℹ️ No theme.json found at {theme_file_path} - skipping theme push")

            # Notify app to load the new theme
            if theme_pushed:
                print("🔄 Notifying app to load theme...")
                self.wait_for_ready(max_wait_time=30)
                self.dispatch_deeplink_to_android(action="load-theme", skip_initial_wait=True)

            if wait_for_ready:
                readiness_status = self.wait_for_ready()
                if not readiness_status.get("isAppReady"):
                    raise Exception("App is not ready to reset.")

            self.dispatch_deeplink_to_android(action="reset", session_id=None)
            return True
        except Exception as exc:
            logger.error("Error in load_data: %s", exc)
            return False

    def append_mock_data(self, mockdata_path: str) -> bool:
        dummy_files = []

        logger.info("APPENDING MOCK DATA")

        try:
            if not os.path.exists(mockdata_path):
                logger.error("Mock data directory not found: %s", mockdata_path)
                return False

            logger.info("Preparing device mockdata directory for append")
            if not self.backend.directory_exists(f"{self.device_base_path}/mockdata"):
                self.backend.execute_command(
                    f"mkdir -p {self.device_base_path}/mockdata/", is_shell=True
                )
                logger.info("Created mockdata directory on device")
            else:
                self.backend.execute_command(
                    f"rm -rf {self.device_base_path}/mockdata/*", is_shell=True
                )
                logger.info("Cleared existing mockdata directory on device")

            for filename in self.mockdata_files:
                local_file = os.path.abspath(os.path.join(mockdata_path, filename))
                remote_file = f"{self.device_base_path}/mockdata/{filename}"

                if not os.path.exists(local_file):
                    logger.warning("%s missing locally, creating dummy placeholder", filename)
                    with open(local_file, "w", encoding="utf-8") as fp:
                        fp.write("[]")
                    dummy_files.append(local_file)

                self.backend.push_file(local_file, remote_file)
                logger.debug("Pushed %s", filename)

            logger.info("Waiting for app readiness before append deep link")
            self.wait_for_ready(max_wait_time=60, poll_interval=2)

            logger.info("Triggering append deep link")
            self.dispatch_deeplink_to_android(action="append-data-to-db", session_id=None)
            logger.info("Mock data append completed successfully")
            return True
        except Exception as exc:
            logger.error("Error in append_mock_data: %s", exc)
            return False
        finally:
            for path in dummy_files:
                try:
                    os.remove(path)
                    logger.debug("Removed dummy file %s", path)
                except Exception as cleanup_err:
                    logger.warning("Could not remove %s: %s", path, cleanup_err)

    def wait_for_ready(self, max_wait_time: int = 60, poll_interval: int = 2) -> Dict[str, Any]:
        logger.info("Checking app readiness...")
        elapsed_time = 0
        spinner = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]
        idx = 0

        while elapsed_time < max_wait_time:
            status = self.is_ready()
            is_ready = status.get("isAppReady", False)
            if is_ready:
                logger.info("App is ready! (%s)", spinner[idx % len(spinner)])
                return status

            logger.debug("Waiting for readiness %s (%ss)", spinner[idx % len(spinner)], elapsed_time)
            idx += 1

            time.sleep(poll_interval)
            elapsed_time += poll_interval

        raise Exception("App did not become ready within the specified wait time.")

    def init_db(self):
        conn = sqlite3.connect(DB_FILE)
        cur = conn.cursor()
        cur.execute(
            """
        CREATE TABLE IF NOT EXISTS app_state (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            is_app_ready BOOLEAN NOT NULL,
            last_updated INTEGER NOT NULL,
            app_version TEXT NOT NULL,
            session_report_id INTEGER,
            FOREIGN KEY(session_report_id) REFERENCES session_report(id)
        )
            """
        )
        cur.execute(
            """
        CREATE TABLE IF NOT EXISTS session_report (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            operation TEXT NOT NULL,
            status_code TEXT NOT NULL,
            status_message TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            duration INTEGER,
            reason_for_failure TEXT,
            stack_trace TEXT,
            details TEXT
        )
            """
        )
        conn.commit()
        conn.close()

    def write_app_state_to_db(self, app_state: Dict[str, Any]):
        self.init_db()
        conn = sqlite3.connect(DB_FILE)
        cur = conn.cursor()
        session_report_id: Optional[int] = None

        if app_state.get("sessionReport"):
            report = app_state["sessionReport"]
            cur.execute(
                """
                INSERT INTO session_report (
                    session_id, operation, status_code, status_message,
                    timestamp, duration, reason_for_failure,
                    stack_trace, details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    report.get("sessionId"),
                    report.get("operation"),
                    report.get("statusCode"),
                    report.get("statusMessage"),
                    report.get("timestamp"),
                    report.get("duration"),
                    report.get("reasonForFailure"),
                    report.get("stackTrace"),
                    json.dumps(report.get("details")) if report.get("details") else None,
                ),
            )
            session_report_id = cur.lastrowid

        cur.execute(
            """
            INSERT INTO app_state (
                is_app_ready, last_updated, app_version, session_report_id
            ) VALUES (?, ?, ?, ?)
            """,
            (
                app_state.get("isAppReady"),
                app_state.get("lastUpdated"),
                app_state.get("appVersion"),
                session_report_id,
            ),
        )

        conn.commit()
        conn.close()
        logger.info("App state and session report saved successfully!")

    def _colorize(self, text: str, color: str) -> str:
            if not self.use_colors:
                return text
            return f"{COLORS.get(color, '')}{text}{COLORS['reset']}"

    def pretty_print_app_state(self, app_state: Dict[str, Any]):
        rows = []
        rows.append(["isAppReady", str(app_state.get("isAppReady"))])
        rows.append(
            [
            "lastUpdated",
                datetime.datetime.fromtimestamp(app_state.get("lastUpdated", 0) / 1000).strftime(
                "%Y-%m-%d %H:%M:%S"
            )
            if app_state.get("lastUpdated")
            else "N/A",
            ]
        )
        rows.append(["appVersion", str(app_state.get("appVersion"))])

        report = app_state.get("sessionReport")
        if report:
            for key in [
                "sessionId",
                "operation",
                "statusCode",
                "statusMessage",
                "timestamp",
                "duration",
                "reasonForFailure",
                "stackTrace",
            ]:
                if key in report and report[key] is not None:
                    rows.append([key, str(report[key])])

            details = report.get("details")
            if details:
                for key in [
                    "storesProcessed",
                    "storesFailed",
                    "dbOperations",
                    "dbValidationAttempts",
                ]:
                    if key in details:
                        value = details[key]
                    if isinstance(value, list):
                            value = ", ".join(str(v) for v in value) if value else "[]"
                            rows.append([key, str(value)])

        headers = ["Field", "Value"]
        all_rows = [headers] + rows
        widths = [max(len(str(row[i])) for row in all_rows) for i in range(2)]
        sep = "-+-".join("-" * width for width in widths)
        logger.info("\n============================")
        logger.info("  APP STATE SUMMARY    ")
        logger.info("============================")
        logger.info(" | ".join(str(headers[i]).ljust(widths[i]) for i in range(2)))
        logger.info(sep)
        for row in rows:
            logger.info(" | ".join(str(row[i]).ljust(widths[i]) for i in range(2)))

    def _pretty_print_details(self, details: Dict[str, Any]):
        logger.info("\n" + "-" * 60)
        logger.info(self._colorize("DETAILS", "bold"))
        logger.info("-" * 60)
        for key, value in details.items():
            if isinstance(value, list):
                if not value:
                    logger.info(f"  {key:20}: []")
                else:
                    logger.info(f"  {key:20}:")
                    for item in value:
                        marker = (
                            self._colorize("✔", "green")
                            if "Failed" not in key
                            else self._colorize("✘", "red")
                        )
                        logger.info(f"    {marker} {item}")
            else:
                logger.info(f"  {key:20}: {value}")

    def _pretty_print_app_state(self, app_state: Dict[str, Any]):
        rows = [
            ["Field", "Value"],
            ["isAppReady", app_state.get("isAppReady")],
            [
                "lastUpdated",
                datetime.datetime.fromtimestamp(app_state.get("lastUpdated", 0) / 1000).strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if app_state.get("lastUpdated")
                else "N/A",
            ],
            ["appVersion", app_state.get("appVersion")],
        ]
        self._pretty_print_table("📱 APP STATE", rows)

        report = app_state.get("sessionReport")
        if report:
            rows = [["Field", "Value"]]
            for key in [
                "sessionId",
                "operation",
                "statusCode",
                "statusMessage",
                "timestamp",
                "duration",
                "reasonForFailure",
                "stackTrace",
            ]:
                if report.get(key) is not None:
                    rows.append([key, report[key]])
            self._pretty_print_table("📝 SESSION REPORT", rows)
            if report.get("details"):
                self._pretty_print_details(report["details"])

    def _pretty_print_table(self, title: str, rows: list):
        col_widths = [max(len(str(r[i])) for r in rows) for i in range(len(rows[0]))]
        logger.info("\n" + "=" * 28)
        logger.info(title)
        logger.info("=" * 28)
        for row in rows:
            logger.info(" | ".join(str(row[i]).ljust(col_widths[i]) for i in range(len(row))))

    @staticmethod
    def read_app_state_file(filepath: str = "app_state.json") -> Dict[str, Any]:
        if not os.path.exists(filepath):
            return {}
        try:
            with open(filepath, "r", encoding="utf-8") as fp:
                return json.load(fp)
        except Exception as exc:
            logger.error("Error reading app_state.json:", exc)
            return {}

    def extract_session_report(
        self, max_wait_time: int = 60, poll_interval: int = 2
    ) -> Dict[str, Any]:
        try:
            time.sleep(0.5)
            state = self.wait_for_ready(max_wait_time=max_wait_time, poll_interval=poll_interval)
            self.write_app_state_to_db(state)
            self.pretty_print_app_state(state)
            return state.get("sessionReport", {})
        except Exception as exc:
            logger.error(f"Failed to extract session report: {exc}")
            return {}

    def _pull_with_retries(
        self,
        remote_path: str,
        local_path: str,
        validate_fn=None,
        description: str = "file",
        max_retries: int = 15,
        max_wait_seconds: Optional[float] = None,
    ):
        """Pull *remote_path*, retrying until it validates or the budget runs out.

        Retries stop at whichever of *max_retries* or *max_wait_seconds* comes
        first.  The wall-clock bound matters more than the attempt count: the
        overwhelming cause of failure here is the app not having written the
        file yet, and if it has not appeared in ``max_wait_seconds`` it is not
        about to.  Spending the caller's entire budget waiting leaves nothing
        for the reset retry that would actually recover -- see
        ``digiworld_eval.local_server.reset_session``.

        Args:
            max_retries: Hard cap on attempts.
            max_wait_seconds: Wall-clock budget.  Defaults to
                ``DIGIWORLD_PULL_TIMEOUT`` (45 s).
        """
        if max_wait_seconds is None:
            max_wait_seconds = PULL_TIMEOUT_SECONDS

        deadline = time.monotonic() + max_wait_seconds
        last_exc = None
        retry = 0
        while retry < max_retries:
            try:
                if not self.backend.file_exists(remote_path):
                    raise Exception(f"{description} not found at {remote_path}")

                os.makedirs(os.path.dirname(local_path), exist_ok=True)
                result = self.backend.pull_file(remote_path, local_path)
                if not result:
                    raise Exception("pull failed")

                if not os.path.exists(local_path) or os.path.getsize(local_path) == 0:
                    raise Exception("pulled file is empty or missing")

                if validate_fn:
                    validate_fn(local_path)

                logger.info(f"Successfully backed up: {description}")
                return
            except Exception as exc:
                last_exc = exc
                retry += 1

                remaining = deadline - time.monotonic()
                if retry >= max_retries or remaining <= 0:
                    break

                wait_time = min(3 if retry <= 2 else retry + 1, remaining)
                logger.warning(
                    f"⚠️ {description.capitalize()} pull attempt {retry} failed: {exc}. "
                    f"Retrying in {wait_time:.0f} seconds..."
                )
                time.sleep(wait_time)

        raise Exception(
            f"Failed to pull {description} after {retry} attempts "
            f"({max_wait_seconds:.0f}s budget): {last_exc}"
        )

    def _validate_sqlite_file(self, path: str):
        with open(path, "rb") as fp:
            header = fp.read(16)
            if not header.startswith(b"SQLite format 3"):
                fp.seek(0)
                snippet = fp.read(200).decode("utf-8", errors="ignore")
                if "cat:" in snippet or "No such file" in snippet:
                    raise Exception("Database file not created on device yet")
                raise Exception("File is not a valid SQLite database")

    def _validate_json_file(self, path: str):
        with open(path, "r", encoding="utf-8") as fp:
            content = fp.read()
            if content.startswith("cat:") or "No such file" in content:
                raise Exception("Rootstore file not created on device yet")
            json.loads(content)

    def _resolve_session_remote_path(self, session_id: str, filename: str) -> str:
        if filename.endswith(".db"):
            remote_filename = f"{session_id}.db"
        else:
            remote_filename = filename
        return f"{self.device_base_path}/sessions/{session_id}/{remote_filename}"

    @staticmethod
    def ensure_mock_file(file_path: str):
        if not os.path.exists(file_path):
            with open(file_path, "w", encoding="utf-8") as fp:
                json.dump([], fp)
        else:
            logger.info(f"{file_path} exists, skipping.")

    # ------------------------------------------------------------------
    # Theme management
    # ------------------------------------------------------------------
    def push_theme(self, theme_name: str, theme_file_path: Optional[str] = None) -> bool:
        """
        Push a theme configuration JSON to the device and trigger theme reload.

        Args:
            theme_name: Name of the theme (e.g., 'theme1-blue', 'theme2-green')
            theme_file_path: Optional custom path to theme file. If not provided,
                           looks in the app's theme directory from appConfig

        Returns:
            bool: True if successful, False otherwise
        """
        try:
            print(self._colorize(f"\n🎨 PUSHING THEME: {theme_name}", "bold"))

            # Determine theme file path
            if theme_file_path is None:
                # Look for theme in data folder (centralized theme storage)
                # Path: digiworld/data/{bundle_id}/themes/{theme_name}.json
                theme_file_path = os.path.join(
                    self.script_dir,
                    'data',
                    self.bundle_id,
                    'themes',
                    f"{theme_name}.json"
                )
                print(f"📂 Looking for theme in: {theme_file_path}")

            if not os.path.exists(theme_file_path):
                print(f"❌ Theme file not found: {theme_file_path}")
                return False

            # Validate theme JSON
            print("📋 Validating theme configuration...")
            try:
                with open(theme_file_path, 'r', encoding='utf-8') as f:
                    theme_config = json.load(f)

                # Basic validation
                if 'name' not in theme_config:
                    print("⚠️ Warning: Theme missing 'name' field")
                if 'mode' not in theme_config or theme_config['mode'] not in ['light', 'dark']:
                    print("⚠️ Warning: Theme missing or invalid 'mode' field")
                if 'colors' not in theme_config:
                    print("❌ Error: Theme missing required 'colors' field")
                    return False

                print(f"✅ Theme validated: {theme_config.get('name', 'Unknown')} ({theme_config.get('mode', 'unknown')} mode)")
            except json.JSONDecodeError as e:
                print(f"❌ Invalid JSON in theme file: {e}")
                return False

            # Create themes directory on device
            theme_dir = f"{self.device_base_path}/themes"
            print(f"📁 Creating themes directory on device...")
            self.backend.execute_command(f"mkdir -p {theme_dir}", is_shell=True)

            # Always push as theme.json (single file approach)
            remote_theme_path = f"{theme_dir}/theme.json"
            print(f"📤 Pushing theme to device: {remote_theme_path}")
            print(f"📂 Source: {theme_name}.json → Target: theme.json")

            try:
                self.backend.push_file(theme_file_path, remote_theme_path)
                print(f"✅ Theme file pushed successfully as theme.json")
            except Exception as push_exc:
                print(f"❌ Failed to push theme file: {push_exc}")
                return False

            # Wait for app to be ready
            print("⏳ Waiting for app to be ready...")
            self.wait_for_ready(max_wait_time=30)

            # Verify theme.json file exists on device
            theme_file_on_device = f"{theme_dir}/theme.json"
            file_exists = self.backend.file_exists(theme_file_on_device)

            if file_exists:
                print(f"✅ Theme file confirmed on device: {theme_file_on_device}")
            else:
                print(f"⚠️  Warning: Could not verify theme file on device")
                print(f"   Continuing anyway (file was pushed successfully)...")

            # Trigger theme load via deeplink (just verification, theme already on device)
            print(f"🔄 Notifying app of theme change...")
            self.dispatch_deeplink_to_android(
                action="load-theme",
                skip_initial_wait=True
            )

            # Wait a moment for deeplink to process
            print("⏳ Waiting for app to acknowledge...")
            time.sleep(2)

            # Force-stop the app
            print(f"🛑 Stopping app to apply theme...")
            self.backend.execute_command(
                f"am force-stop {self.bundle_id}",
                is_shell=True
            )

            # Wait a moment
            time.sleep(1)

            # Restart the app
            print(f"🚀 Restarting app with new theme...")
            self.backend.execute_command(
                f"am start -n {self.bundle_id}/.MainActivity",
                is_shell=True
            )

            # Wait for app to start
            print("⏳ Waiting for app to restart...")
            time.sleep(3)

            print(self._colorize(f"🎉 Theme '{theme_name}' loaded and applied successfully!", "green"))
            print(self._colorize(f"✨ The app should now show the new colors!", "green"))
            return True

        except Exception as exc:
            print(f"❌ Error pushing theme: {exc}")
            return False

    def list_available_themes(self) -> list[str]:
        """
        List all available theme files for the current app.

        Returns:
            list: List of theme names (without .json extension)
        """
        try:
            theme_path = self.appConfig.get(self.bundle_id, {}).get("theme_path")
            if not theme_path:
                print(f"❌ No theme_path configured for {self.bundle_id}")
                return []

            monorepo_root = os.path.dirname(self.script_dir)
            themes_dir = os.path.join(monorepo_root, theme_path)

            if not os.path.exists(themes_dir):
                print(f"❌ Themes directory not found: {themes_dir}")
                return []

            theme_files = [
                f.replace('.json', '')
                for f in os.listdir(themes_dir)
                if f.endswith('.json') and f.startswith('theme')
            ]

            return sorted(theme_files)

        except Exception as exc:
            print(f"❌ Error listing themes: {exc}")
            return []

    def display_available_themes(self):
        """Display all available themes in a formatted list."""
        themes = self.list_available_themes()

        if not themes:
            print("❌ No themes found")
            return

        print(self._colorize("\n📋 AVAILABLE THEMES", "bold"))
        print("=" * 50)

        for i, theme in enumerate(themes, 1):
            # Try to read theme details
            theme_path = self.appConfig.get(self.bundle_id, {}).get("theme_path")
            monorepo_root = os.path.dirname(self.script_dir)
            theme_file = os.path.join(monorepo_root, theme_path, f"{theme}.json")

            try:
                with open(theme_file, 'r', encoding='utf-8') as f:
                    config = json.load(f)
                    name = config.get('name', 'Unknown')
                    mode = config.get('mode', 'unknown')
                    primary_color = config.get('colors', {}).get('palette', {}).get('primary500', 'N/A')

                    print(f"{i}. {theme}")
                    print(f"   Name: {name}")
                    print(f"   Mode: {mode}")
                    print(f"   Primary Color: {primary_color}")
                    print()
            except Exception:
                print(f"{i}. {theme} (unable to read details)")

        print("=" * 50)
