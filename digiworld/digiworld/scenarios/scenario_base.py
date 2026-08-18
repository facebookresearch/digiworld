# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Base scenario class with core functionality."""

from abc import ABC, abstractmethod
import os
import random
import time
import logging
from datetime import datetime
from typing import List, Dict, Optional, Any, Tuple

from packaging.version import Version, InvalidVersion

from digiworld.adb.actions import ADBActions
from digiworld.adb.backends import EmulatorBackend, ADBBackend
from digiworld.scenarios.config_loader import ConfigLoader
from digiworld.scenarios.state_manager import StateManager
from digiworld.scenarios.context_extractor import ContextExtractor
from digiworld.scenarios.mockdata_handler import MockdataHandler
from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.app_registry import get_bundle_id as registry_get_bundle_id, get_apk_key
from digiworld.profile_variants import expand_with_variants, list_base_profiles

logger = logging.getLogger(__name__)


class Scenario(ABC):
    """Base class for task scenarios that handle verification."""
    
    def __init__(self, base_path: str, instance_tag: Optional[str] = None, backend: Optional[EmulatorBackend] = None):
        """
        Initialize a scenario with a task name, app name, and state information.
        Automatically loads scenario and instance configuration files.

        Args:
            base_path: The base path where state data is stored.
            instance_tag: Optional tag to specify which instance config to load.
            backend: Optional emulator backend (ADBBackend or GenymotionBackend).
                     Defaults to ADBBackend() if None is provided.

        Raises:
            ValueError: If no states are found in the base path.
        """
        self.base_path = base_path
        self.instance_tag = instance_tag
        
        # Initialize helper classes
        self._config_loader = ConfigLoader(self)
        self._state_manager = StateManager(self)
        self._context_extractor = ContextExtractor(self)
        self._mockdata_handler = MockdataHandler(self)
        self.backend = backend
        
        # Automatically load config files
        self._load_config_files()

    def reset_initial_state(
        self,
        theme: Optional[str] = None,
        ui_state: Optional[str] = None,
    ) -> str:
        """Reset the app to an initial state for scenario execution.

        Selects a base profile (from ``compatible_profiles``), then
        independently resolves a theme and a UI-state override.  The three
        dimensions are orthogonal — any base profile can be combined with
        any theme and any UI state at runtime, without materialised variant
        directories on disk.

        Args:
            theme: Optional theme key (e.g. ``"midnight"``).  When set,
                the corresponding JSON is loaded from
                ``state_data/<bundle>/.themes/<theme>.json`` and pushed
                instead of the profile's own ``theme.json``.
                When ``None``, controlled by ``DIGIWORLD_RANDOMIZE_THEME``.
            ui_state: Optional UI-state ID (e.g. ``"contacts_var0"``).
                When set, the matching rootstore is loaded from
                ``state_data/<bundle>/.ui_states/<profile>/<state>.json`` and pushed
                instead of the session's own ``rootstore.json``.
                When ``None``, controlled by
                ``DIGIWORLD_RANDOMIZE_UI_STATE``.

        Returns:
            The name of the selected base profile.
        """
        # Construct the app state data path
        self.apk_name = getattr(self, 'apk_name', self.app_name)
        app_state_path = os.path.join(self.base_path, self.apk_name)

        if not os.path.exists(app_state_path):
            raise ValueError(f"No state data found for app: {getattr(self, 'app_name', self.app_name)}")

        # Get available BASE profiles only (skip variant directories)
        available_profiles = list_base_profiles(app_state_path)

        if not available_profiles:
            raise ValueError(f"No valid profiles found in: {app_state_path}")

        # Filter by compatible profiles if specified.
        if hasattr(self, 'compatible_profiles') and self.compatible_profiles:
            compatible_set = set(self.compatible_profiles)
            compatible_available = [p for p in available_profiles if p in compatible_set]
            if compatible_available:
                selected_profile = self._pick_profile(compatible_available)
            else:
                raise ValueError(f"No compatible profiles found. Available profiles: {available_profiles}, Required: {self.compatible_profiles}")
        else:
            selected_profile = self._pick_profile(available_profiles)

        self.initial_state_path = os.path.join(app_state_path, selected_profile, "sessions", "default")
        self.profile_name = selected_profile
        self.initial_state_id = "default"

        # --- Resolve theme override ---
        theme_override_path = self._resolve_theme_override(
            app_state_path, theme
        )
        # Store resolved theme name for metadata
        if theme_override_path:
            self.theme_name = os.path.splitext(os.path.basename(theme_override_path))[0]
        else:
            self.theme_name = None

        # --- Resolve UI-state (rootstore) override ---
        rootstore_override_path = self._resolve_ui_state_override(
            app_state_path, selected_profile, ui_state
        )
        # Store resolved UI state name for metadata
        if rootstore_override_path:
            self.ui_state_name = os.path.splitext(os.path.basename(rootstore_override_path))[0]
        else:
            self.ui_state_name = None

        # Get bundle ID through configuration
        bundle_id = self._get_bundle_id()

        adb = ADBActions(bundle_id=bundle_id, custom_path=self.base_path, backend=self.backend)

        # Verify installed app version is compatible with current scenarios
        self._verify_app_version(bundle_id, adb)

        # Multimedia assets are addressed by record id (assets/menu/<item_id>.png,
        # assets/songs/<song_id>/main.jpg, ...) and every profile has its own id
        # set, so they have to match the mockdata that is about to be pushed.
        # set_environment() deliberately skips them, and the container bakes
        # whichever profile init_apps happened to pick -- without this, a task
        # running on a different profile renders the baked profile's images, or
        # no image at all for ids that profile never had.
        #
        # push_app_assets() is guarded by a device-side marker recording the
        # profile currently on disk, so this costs one `cat` and returns when
        # the assets already match.
        self._sync_app_assets(adb, self.profile_name)

        # Set environment with optional theme/rootstore overrides
        adb.set_environment(
            data_id=self.profile_name,
            theme_override=theme_override_path,
            rootstore_override=rootstore_override_path,
        )
        adb.wait_for_ready()

        # Handle time resolution if specified in scenario config
        self._handle_time_resolution(adb)
        
        # Handle mockdata if needed
        if hasattr(self, 'additional_mockdata') and self.additional_mockdata and self.instance_tag:
            initial_state_path, state_id = self._mockdata_handler.handle_mockdata(adb)
            self.initial_state_path = initial_state_path
            self.initial_state_id = state_id
        self.adb = adb
        
        # Resolve scenario context templates AFTER all ADB/mockdata operations are complete
        self._resolve_scenario_context()
        
        # Extract current user info from rootstore.json (common pattern for all apps)
        self._extract_current_user_info()

        return selected_profile

    @staticmethod
    def _sync_app_assets(adb: ADBActions, profile: str) -> None:
        """Make the device's multimedia assets match *profile*.

        A no-op when the device marker already names *profile*.  Set
        ``DIGIWORLD_SKIP_ASSET_SYNC=true`` to opt out -- useful for text-only
        task suites where the transfer cost is not worth paying, at the price
        of images that may belong to another profile.

        Never raises: wrong or missing images degrade a task, but failing the
        whole reset over them would lose it outright.
        """
        if os.environ.get("DIGIWORLD_SKIP_ASSET_SYNC", "").lower() in ("true", "1", "yes"):
            logger.debug("DIGIWORLD_SKIP_ASSET_SYNC set — leaving device assets as they are")
            return

        try:
            if not adb.push_app_assets(data_id=profile):
                logger.warning(
                    "Could not sync assets for profile '%s'; the app may show "
                    "images from another profile", profile,
                )
        except Exception:
            logger.exception("Asset sync raised for profile '%s' — continuing", profile)

    def load_app_assets(
        self,
        profile: Optional[str] = None,
        force: bool = False,
        method: str = "auto",
        workers: int = 5,
    ) -> bool:
        """Push the multimedia assets/ folder for *profile* to the device.

        Call this once when the emulator starts (or via the "Load Assets" UI
        button) to pre-load images/videos.  JSON and .db files are pushed
        by ``reset_initial_state`` on every reset — this method handles only
        the slow multimedia transfer.

        Args:
            profile: Profile name (e.g. ``"default"``).  Falls back to
                ``self.profile_name`` (set by a prior
                ``reset_initial_state`` call) and then ``"default"``.
            force: Pass ``True`` after wiping the emulator to bypass the
                marker guard and re-push assets unconditionally.
            method: ``"parallel"`` (raw adb push, configurable workers) or
                ``"zip"`` (zip→push→unzip, ~3× faster for 5K+ files).
            workers: Thread count for ``"parallel"`` method (5 recommended;
                see asset_transfer_guide.md).

        Returns:
            ``True`` on success, ``False`` on error.
        """
        data_id = profile or getattr(self, "profile_name", None) or "default"
        bundle_id = self._get_bundle_id()

        # Reuse the ADB instance created by reset_initial_state when possible
        # so the in-memory _active_asset_profile guard is preserved.
        adb: ADBActions = getattr(self, "adb", None) or ADBActions(
            bundle_id=bundle_id, custom_path=self.base_path, backend=self.backend
        )
        ok = adb.push_app_assets(
            data_id=data_id, force=force, method=method, workers=workers
        )
        self.adb = adb
        return ok

    def _resolve_theme_override(
        self, app_state_path: str, theme: Optional[str]
    ) -> Optional[str]:
        """Return the path to a theme JSON override, or ``None``.

        Resolution order:
        1. Explicit *theme* argument (from caller / demo UI).
        2. ``DIGIWORLD_RANDOMIZE_THEME=true`` → pick a random theme from
           ``.themes/``.
        3. No override → profile's own ``theme.json`` is used (default).
        """
        themes_dir = os.path.join(app_state_path, ".themes")

        if theme:
            # Explicit theme requested
            path = os.path.join(themes_dir, f"{theme}.json")
            if os.path.exists(path):
                logger.info("Theme override: %s", theme)
                return path
            logger.warning("Theme '%s' not found at %s", theme, path)
            return None

        randomize = os.environ.get(
            "DIGIWORLD_RANDOMIZE_THEME", ""
        ).lower() in ("true", "1", "yes")
        if randomize and os.path.isdir(themes_dir):
            available = [
                f for f in os.listdir(themes_dir)
                if f.endswith(".json") and not f.startswith("_")
            ]
            if available:
                chosen = random.choice(available)
                logger.info("Random theme: %s", chosen)
                return os.path.join(themes_dir, chosen)

        return None

    def _resolve_ui_state_override(
        self,
        app_state_path: str,
        profile_name: str,
        ui_state: Optional[str],
    ) -> Optional[str]:
        """Return the path to a rootstore JSON override, or ``None``.

        Resolution order:
        1. Explicit *ui_state* argument (from caller / demo UI).
        2. ``DIGIWORLD_RANDOMIZE_UI_STATE=true`` → pick a random
           non-home state from ``state_data/<bundle>/.ui_states/<profile>/``.
        3. No override → session's own ``rootstore.json`` (default).
        """
        ui_states_dir = os.path.join(
            app_state_path, ".ui_states", profile_name
        )

        if ui_state:
            # Explicit UI state requested — look for the rootstore file
            path = os.path.join(ui_states_dir, f"{ui_state}.json")
            if os.path.exists(path):
                logger.info("UI state override: %s", ui_state)
                return path
            # Bare route ID (e.g. "transactions") won't match generated
            # filenames which include a _var suffix (e.g. "transactions_var0").
            # Fall back to _state_summary.json to resolve the route_id.
            summary_path = os.path.join(ui_states_dir, "_state_summary.json")
            if os.path.exists(summary_path):
                import json as _json
                with open(summary_path) as f:
                    summary = _json.load(f)
                for entry in summary:
                    if entry.get("route_id") == ui_state:
                        resolved = os.path.join(ui_states_dir, entry["filename"])
                        if os.path.exists(resolved):
                            logger.info("UI state override: %s -> %s", ui_state, entry["filename"])
                            return resolved
                        break
            logger.warning("UI state '%s' not found at %s", ui_state, path)
            return None

        randomize = os.environ.get(
            "DIGIWORLD_RANDOMIZE_UI_STATE", ""
        ).lower() in ("true", "1", "yes")
        if randomize and os.path.isdir(ui_states_dir):
            # Load state summary to find non-home states
            summary_path = os.path.join(ui_states_dir, "_state_summary.json")
            if os.path.exists(summary_path):
                import json
                with open(summary_path) as f:
                    summary = json.load(f)
                # Include all states (including home) for full randomization
                candidates = [s["filename"] for s in summary]
                if candidates:
                    chosen = random.choice(candidates)
                    logger.info("Random UI state: %s", chosen)
                    return os.path.join(ui_states_dir, chosen)

        return None

    @staticmethod
    def _pick_profile(candidates: List[str]) -> str:
        """Select a profile from *candidates*.

        When ``DIGIWORLD_RANDOMIZE_CONTENT`` is truthy (``true``, ``1``,
        ``yes``), picks a random profile.  Otherwise (the default),
        deterministically picks ``"default"`` if available, else the
        first candidate alphabetically.

        Also honours the legacy ``DIGIWORLD_SINGLE_PROFILE`` variable
        for backward compatibility (``false`` ≙ randomize).
        """
        randomize = os.environ.get(
            "DIGIWORLD_RANDOMIZE_CONTENT", ""
        ).lower() in ("true", "1", "yes")

        if not randomize:
            # Legacy compat: DIGIWORLD_SINGLE_PROFILE=false → randomize
            legacy = os.environ.get("DIGIWORLD_SINGLE_PROFILE", "true")
            if legacy.lower() in ("false", "0", "no"):
                randomize = True

        if randomize:
            return random.choice(candidates)

        if "default" in candidates:
            return "default"
        return candidates[0]

    def _extract_current_user_info(self) -> None:
        """
        Extract current user ID and email from rootstore.json.
        Falls back to the profile's source rootstore in state_data when the
        device-exported rootstore has no logged-in user (e.g. container
        environments where the app was never interactively logged into).
        """
        json_path = os.path.join(self.initial_state_path, "rootstore.json")
        if os.path.exists(json_path):
            self.current_user_id, self.current_user_email = self._get_current_user_info(json_path)

        if not self.current_user_id and hasattr(self, 'adb') and self.adb:
            profile_rootstore = os.path.join(
                self.adb.backup_dir,
                self.adb.current_data_id,
                "sessions", "default", "rootstore.json",
            )
            if os.path.exists(profile_rootstore):
                self.current_user_id, self.current_user_email = self._get_current_user_info(profile_rootstore)
                if self.current_user_id:
                    logger.info(
                        "Resolved user from profile source rootstore: %s (ID: %s)",
                        self.current_user_email, self.current_user_id,
                    )
                else:
                    logger.warning("Profile source rootstore at %s also has no currentUser", profile_rootstore)
            else:
                logger.warning("No profile source rootstore found at %s", profile_rootstore)
    
    def _resolve_scenario_context(self) -> None:
        """Resolve scenario context templates using template infrastructure.

        Uses the app-specific template resolver (via ``_create_template_resolver``)
        so that app-specific templates like ``{{current_user_password}}`` are
        handled correctly.
        """
        if not hasattr(self, 'raw_scenario_context') or not self.raw_scenario_context:
            self.resolved_scenario_context = {}
            logger.debug("No scenario context to resolve")
            return

        try:
            db_path = os.path.join(self.initial_state_path, f"{self.initial_state_id}.db")
            logger.info(f"Resolving scenario context using database: {db_path}")

            user_context = self._context_extractor.extract_user_context(db_path)

            # Extract any additional context fields declared by the scenario
            # (e.g. current_user_password) so the resolver can use them.
            context_fields = getattr(self, '_scenario_config', {}).get('context_fields', [])
            for field_name in context_fields:
                if field_name not in user_context:
                    value = self._extract_context_field(field_name, db_path, user_context)
                    if value is not None:
                        user_context[field_name] = value

            positioning_data = self._get_positioning_data(db_path)
            context_resolver = self._create_template_resolver(user_context, positioning_data)
            self.resolved_scenario_context = context_resolver.resolve_object(self.raw_scenario_context)

            logger.info(f"Successfully resolved scenario context: {self.resolved_scenario_context}")

        except (FileNotFoundError, KeyError, ValueError) as e:
            logger.error(f"Error resolving scenario context: {e}", exc_info=True)
            logger.warning("Continuing with empty context to avoid breaking scenario execution")
            self.resolved_scenario_context = {}
    
    def _get_bundle_id(self) -> str:
        """
        Get bundle ID for the current app.
        First tries app_config, then falls back to centralized app registry.
        
        Returns:
            str: The bundle ID for the current app
        """
        if hasattr(self, 'app_config') and 'bundle_id' in self.app_config:
            return self.app_config['bundle_id']
        
        # Fallback to centralized app registry
        bundle_id = registry_get_bundle_id(self.app_name.lower())
        if not bundle_id:
            # Also try 'shop' alias for 'ecommerce'
            if self.app_name.lower() == 'shop':
                bundle_id = registry_get_bundle_id('ecommerce')
        
        if not bundle_id:
            raise ValueError(f"Unknown app name: {self.app_name}. Please provide bundle_id in app_config.json")
        
        return bundle_id
    
    def _verify_app_version(self, bundle_id: str, adb: ADBActions) -> None:
        """
        Verify the installed app version is compatible with current scenarios.
        
        Loads minimum version requirements from apk_versions.json and compares
        against the version installed on the device via dumpsys package.
        
        Args:
            bundle_id: Android package name
            adb: ADBActions instance with an initialized backend
            
        Raises:
            RuntimeError: If the installed version is below the minimum required
        """
        try:
            import digiworld
            apk_versions = digiworld.get_apk_versions()
        except FileNotFoundError:
            logger.debug("apk_versions.json not found, skipping version check")
            return
        
        # Look up the minimum version using the apk_key for this app
        apk_key = get_apk_key(self.app_name.lower())
        if not apk_key or apk_key not in apk_versions:
            logger.debug(f"No version requirement found for app '{self.app_name}' (apk_key={apk_key})")
            return
        
        min_version_str = apk_versions[apk_key]
        
        backend = adb.backend
        if backend is None:
            backend = ADBBackend()
        
        output = backend.run_shell_with_output(
            f"dumpsys package {bundle_id} | grep versionName"
        )
        if not output:
            logger.warning(f"Could not query installed version for {bundle_id}, skipping version check")
            return
        
        installed_version_str = None
        for line in output.strip().splitlines():
            if "versionName=" in line:
                installed_version_str = line.split("versionName=")[1].strip()
                break
        
        if not installed_version_str:
            logger.warning(f"Could not parse versionName for {bundle_id}, skipping version check")
            return
        
        try:
            installed_version = Version(installed_version_str)
            min_version = Version(min_version_str)
        except InvalidVersion as e:
            logger.warning(f"Invalid version format for {bundle_id}: {e}")
            return
        
        if installed_version < min_version:
            raise RuntimeError(
                f"Incompatible app version: {self.app_name} has version {installed_version_str} "
                f"installed but >= {min_version_str} is required. "
                f"Run setup_emulator.py --from-lockfile to update."
            )
        
        logger.info(f"App version OK: {self.app_name} {installed_version_str} >= {min_version_str}")
    
    def _handle_time_resolution(self, adb: ADBActions) -> None:
        """Handle time resolution by setting device time if specified in scenario config."""
        scenario_time = self.scenario_config.get('time')
        if scenario_time:
            logger.info(f"Scenario specifies time: {scenario_time}")
            self._set_device_time(adb, scenario_time)
    
    def _set_device_time(self, adb: ADBActions, iso_time_string: str) -> None:
        """Sets the device time using ADB shell date command.

        Ensures adbd runs as root (required for setting time on emulators),
        then uses ``toybox date`` to change the clock.
        """
        if iso_time_string.endswith('Z'):
            dt = datetime.fromisoformat(iso_time_string.replace('Z', '+00:00'))
        else:
            dt = datetime.fromisoformat(iso_time_string)

        date_format = dt.strftime("%m%d%H%M%Y.%S")
        logger.info(f"Setting device time to: {iso_time_string}")

        # Restart adbd as root first (needed on Google-API emulator images)
        import subprocess
        serial = getattr(adb.backend, 'device_serial', None)
        root_cmd = ["adb"] + (["-s", serial] if serial else []) + ["root"]
        try:
            subprocess.run(root_cmd, capture_output=True, timeout=10)
            import time as _time
            _time.sleep(2)
        except Exception as exc:
            logger.debug("adb root failed (may already be root): %s", exc)

        # Now set the time
        for cmd in [
            f"toybox date {date_format}",
            f"su 0 toybox date {date_format}",
        ]:
            try:
                adb.backend.execute_command(cmd, is_shell=True)
                logger.info("Device time set successfully via: %s", cmd)
                return
            except Exception as exc:
                logger.debug("Time-set attempt '%s' failed: %s", cmd, exc)

        logger.warning(
            "Could not set device time to %s. The emulator may be a production "
            "build that does not support time manipulation (adb root + toybox date). "
            "Continuing with current device time.",
            iso_time_string,
        )

    def _load_config_files(self) -> None:
        """Load all configuration files using ConfigLoader."""
        self._config_loader.load_all_configs()

    def _get_supported_context_fields(self) -> Dict[str, str]:
        """
        Get the context fields supported by this scenario type.
        Subclasses can override this to add scenario-specific fields.

        Returns:
            Dict mapping field names to descriptions
        """
        return {
            'current_user_email': 'The current user\'s email address used for authentication and identification in the app',
            'current_user_id': 'The unique numeric identifier of the current user in the database',
            'profile_name': 'The name of the test profile being used, which determines the user data and app state (e.g., test-profile-1, test-profile-2)'
        }

    def _extract_context_field(self, field_name: str, db_path: str, user_context: Dict) -> Optional[Any]:
        """
        Extract a specific context field. Override in subclasses for scenario-specific fields.
        
        Args:
            field_name: Name of the context field to extract
            db_path: Path to the database
            user_context: Already extracted user context
            
        Returns:
            Field value or None if field is not handled by this class
        """
        if field_name == 'profile_name':
            return getattr(self, 'profile_name', 'unknown')
        return None

    def _get_positioning_data(self, db_path: str) -> Dict:
        """
        Get positioning data for template resolution.
        Override in subclasses for scenario-specific positioning logic.
        """
        return {}
    
    def _create_template_resolver(self, user_context: Dict, positioning_data: Dict) -> TemplateResolver:
        """
        Create template resolver. Override in subclasses for scenario-specific resolvers.
        """
        return TemplateResolver(user_context)

    # System prompt generation methods
    def generate_system_prompt(self, db_path: Optional[str] = None) -> str:
        """Generate a complete system prompt for this scenario including context information."""
        try:
            task_description = getattr(self, 'task_description', 'No task description available')
            context_info = self._context_extractor.format_context_for_system_prompt(db_path)

            prompt_parts = [
                "You are an AI assistant helping with a mobile app task.",
                "",
                f"Task: {task_description}"
            ]
            
            if context_info:
                prompt_parts.extend([
                    "",
                    "Available context information:",
                    context_info
                ])
            
            prompt_parts.extend(["", "Please help the user complete this task."])

            return "\n".join(prompt_parts)

        except (KeyError, ValueError, FileNotFoundError) as e:
            logger.error(f"Error generating system prompt: {e}", exc_info=True)
            return f"Error generating system prompt: {str(e)}"

    def format_context_for_system_prompt(self, db_path: Optional[str] = None) -> str:
        """
        Format context information for inclusion in system prompts.
        This delegates to the context extractor to create context information.
        
        Args:
            db_path: Optional path to database for context extraction
            
        Returns:
            Formatted string with context information ready for system prompts
        """
        return self._context_extractor.format_context_for_system_prompt(db_path)

    # Configuration access methods
    def get_app_config(self) -> Dict[str, Any]:
        """Get the app configuration."""
        return getattr(self, 'app_config', {})

    def get_scenario_config(self) -> Dict[str, Any]:
        """Get the scenario configuration."""
        return getattr(self, 'scenario_config', {})

    def get_instance_config(self, instance_name: str) -> Optional[Dict[str, Any]]:
        """Get configuration for a specific instance."""
        return getattr(self, 'instance_configs', {}).get(instance_name)

    def get_task_description(self) -> str:
        """Get the complete task description with parameters resolved."""
        return getattr(self, 'task_description', 'No task description available')

    def get_scenario_context(self) -> Dict[str, Any]:
        """Get the resolved scenario context."""
        return getattr(self, 'resolved_scenario_context', {})

    def get_expected_trajectory(self) -> List[str]:
        """Get the expected trajectory of state IDs for the current initial state."""
        return []
    
    # Database query methods (delegated to StateManager)
    def _connect_to_db(self, db_path: str) -> Any:
        """Connect to the SQLite database."""
        return self._state_manager.connect_to_db(db_path)

    def _execute_query(self, query: str, params: tuple = ()) -> List[Any]:
        """Execute a SQL query on the database."""
        if not hasattr(self, 'db_path'):
            raise ValueError("db_path not set on scenario instance")
        return self._state_manager.execute_query(self.db_path, query, params)

    def _execute_query_in_path(self, query: str, params: tuple, state_path: str) -> List[Any]:
        """Execute a SQL query on the database within a specific state path."""
        if not os.path.isabs(state_path):
            state_path = self._state_manager.state_ids_to_paths([state_path])[0]
        return self._state_manager.execute_query_in_path(query, params, state_path)

    def _get_current_user_info(self, json_path: str) -> Tuple[str, str]:
        """Get the current user's ID and email from the JSON store."""
        return self._state_manager.get_current_user_info(json_path)
    
    def create_new_state_from(self, source_state_id: str) -> str:
        """Create a new state by duplicating an existing state."""
        return self._state_manager.create_new_state_from(source_state_id, self.base_path)

    def filter_db_write_actions(self, state_paths: List[str]) -> List[str]:
        """Filter a trajectory to only keep states that represent write actions."""
        return self._state_manager.filter_db_write_actions(state_paths)

    def state_ids_to_paths(self, state_ids: List[str]) -> List[str]:
        """Convert a sequence of state IDs to full state directory paths."""
        return self._state_manager.state_ids_to_paths(state_ids)

    def compare_database_records(self, state_1_path: str, state_2_path: str, query: str, params: tuple) -> Tuple[List[Any], List[Any], List[Any]]:
        """Compare database records between two states."""
        # Normalize paths
        state_1_path = self._state_manager._normalize_state_path_or_id(state_1_path)
        state_2_path = self._state_manager._normalize_state_path_or_id(state_2_path)
        return self._state_manager.compare_database_records(state_1_path, state_2_path, query, params)
    
    def get_current_session(self, rootstore: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Get the current session from rootstore.json.
        
        Handles both data structures:
        - 'sessions' (plural, array)
        - 'session' (singular, object)

        Args:
            rootstore: The parsed rootstore.json content
            
        Returns:
            The current session dict, or None if not found
        """
        session_store = rootstore.get('sessionStore', {})
        
        # Try plural 'sessions' first (array format - used by some apps like eats)
        sessions = session_store.get('sessions', [])
        if sessions and isinstance(sessions, list):
            # The sessions array is a history of all navigations
            # The last session in the array is the most recent (current) screen
            return sessions[-1]
        
        # Try singular 'session' (object format - used by most apps)
        session = session_store.get('session', {})
        if session:
            return session
        
        return None
    
    @abstractmethod
    def verify_trajectory(self, state_paths: List[str]) -> Dict[str, float]:
        """
        Verify if a sequence of states (write actions) matches the expected sequence.
        
        Args:
            state_paths: A list of state paths representing states in the trajectory after write actions.

        Returns:
            Dict[str, float]: Metrics related to agent safety and task completion.
        """
        pass
    
    def _extract_user_context(self, db_path: str) -> Dict[str, Any]:
        """Extract user context from database."""
        return self._context_extractor.extract_user_context(db_path)

