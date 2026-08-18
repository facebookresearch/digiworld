# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Mockdata loading and handling for scenarios."""

import os
import re
import json
import time
import inspect
import shutil
import logging
import sqlite3
from pathlib import Path
from typing import List, Dict, Any, Set
from digiworld.scenarios.template_resolver import TemplateResolver
from digiworld.adb.validator import DatabaseValidator

logger = logging.getLogger(__name__)


class MockdataHandler:
    """Handles loading and inserting mockdata into databases."""
    
    def __init__(self, scenario_instance):
        """
        Initialize the mockdata handler.
        
        Args:
            scenario_instance: The scenario instance to handle mockdata for
        """
        self.scenario = scenario_instance
    
    def handle_mockdata(self, adb):
        """
        Handle mockdata loading and database merging.

        This method:
        1. Uses append/dbrefresh deep link workflow
        2. Collects and resolves mockdata templates
        3. Merges data into the database
        4. Updates app screens via dbrefresh

        Args:
            adb: ADBActions instance for database operations
            
        Returns:
            Tuple of (initial_state_path, state_id)
        """
        # Generate session ID for this append operation
        session_id = f"scenario_append_{int(time.time() * 1000)}"
        
        logger.info(f"Starting mockdata append workflow for session: {session_id}")
        
        # Use a per-emulator db-forge directory to avoid race conditions
        # when multiple rollout threads operate on the same app concurrently.
        emulator_id = getattr(adb.backend, 'ip', None) or str(os.getpid())
        emulator_id = emulator_id.replace(".", "_").replace(":", "_")
        db_forge_dir = os.path.join(adb.script_dir, "data", adb.bundle_id, f"db-forge-{emulator_id}")
        os.makedirs(db_forge_dir, exist_ok=True)

        # Remote paths
        remote_db_path = f"{adb.device_base_path}/db-forge/current.db"
        remote_json_path = f"{adb.device_base_path}/db-forge/current.json"

        # Local paths
        current_db_path = os.path.join(db_forge_dir, "current.db")
        current_json_path = os.path.join(db_forge_dir, "current.json")

        # Steps 1-2: ask the app to export its database, then pull it.
        #
        # The server force-stops the app before a reset, so on the first reset
        # the app is cold. A `get_db_to_modify` deep link that arrives before
        # the app can service it is accepted but never writes db-forge/current.db,
        # and the pull then burns its whole 45s budget and fails the reset. The
        # export request has to be re-dispatched, not just re-pulled, so the
        # wait-for-ready and both steps live inside one retry loop.
        rounds = int(os.environ.get("DIGIWORLD_MOCKDATA_EXPORT_ROUNDS", "3"))
        for _round in range(1, rounds + 1):
            # Make sure the app is actually up before asking it for anything.
            try:
                adb.wait_for_ready()
            except Exception as e:
                logger.warning("wait_for_ready before db export failed: %s", e)

            logger.info(
                "Step 1: Preparing app for database modification (round %d/%d)...",
                _round, rounds,
            )
            prepared = False
            for _attempt in range(3):
                if adb.get_db_to_modify(session_id):
                    prepared = True
                    break
                logger.warning("Retry %d/3 for get_db_to_modify", _attempt + 1)
                time.sleep(2)
            if not prepared:
                logger.warning(
                    "get_db_to_modify never succeeded in round %d/%d", _round, rounds
                )
                continue

            # Drop any stale export so a previous round's file cannot be
            # mistaken for this round's.
            for stale in ["current.db", "current.json"]:
                stale_path = os.path.join(db_forge_dir, stale)
                if os.path.exists(stale_path):
                    try:
                        os.remove(stale_path)
                    except Exception:
                        pass

            logger.info("Step 2: Pulling current database from device...")
            try:
                adb._pull_with_retries(
                    remote_path=remote_db_path,
                    local_path=current_db_path,
                    validate_fn=adb._validate_sqlite_file,
                    description="database",
                )
                adb._pull_with_retries(
                    remote_path=remote_json_path,
                    local_path=current_json_path,
                    validate_fn=adb._validate_json_file,
                    description="rootstore",
                )
            except Exception as e:
                logger.warning(
                    "Database export pull failed (round %d/%d): %s", _round, rounds, e
                )
                continue

            if os.path.exists(current_db_path):
                break
        else:
            raise Exception(
                f"App never exported its database for {adb.bundle_id} after "
                f"{rounds} rounds; cannot inject mockdata"
            )

        if not os.path.exists(current_db_path):
            raise Exception(f"Failed to pull current database from device: {current_db_path}")

        # Step 3: Load and resolve mockdata templates
        logger.info("Step 3: Loading and resolving mockdata templates...")
        resolved_mockdata = self._resolve_templates_in_mockdata(adb, current_db_path)
        
        if not resolved_mockdata:
            logger.info("No mockdata to append, skipping merge")
            # Return path to the db-forge directory where current.json exists
            db_forge_dir = os.path.join(adb.script_dir, "data", adb.bundle_id, "db-forge")
            return db_forge_dir, "default"
        
        # Step 4: Merge data into database
        logger.info("Step 4: Merging data...")
        
        db_validator = DatabaseValidator(adb.bundle_id, adb.appConfig.get(adb.bundle_id, {}))
        source_path = os.path.join(db_forge_dir, "source")
        if os.path.exists(source_path):
            shutil.rmtree(source_path)
            logger.debug("Cleared stale source directory")
        
        os.makedirs(source_path, exist_ok=True)
        
        if not resolved_mockdata:
            logger.warning("No mockdata to append")
        
        for filename, data in resolved_mockdata.items():
            source_file = os.path.join(source_path, filename)
            with open(source_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2)
            logger.debug(f"Wrote resolved mockdata to {filename}")

        # Step 4.5: Copy instance mockdata assets into db-forge/source/assets/
        # so they can be pushed to the device alongside the modified database.
        if self.scenario.instance_tag:
            instance_mockdata_path = self._get_instance_mockdata_path()
            if instance_mockdata_path:
                instance_assets_path = os.path.join(instance_mockdata_path, "assets")
                if os.path.isdir(instance_assets_path):
                    source_assets_path = os.path.join(source_path, "assets")
                    if os.path.exists(source_assets_path):
                        shutil.rmtree(source_assets_path)
                    image_exts = {".png", ".jpg", ".jpeg", ".webp"}
                    copied = 0
                    for root, _, files in os.walk(instance_assets_path):
                        for fname in files:
                            if os.path.splitext(fname)[1].lower() in image_exts:
                                src = os.path.join(root, fname)
                                rel = os.path.relpath(src, instance_assets_path)
                                rel = self._resolve_asset_relative_path(rel)
                                dst = os.path.join(source_assets_path, rel)
                                os.makedirs(os.path.dirname(dst), exist_ok=True)
                                shutil.copy2(src, dst)
                                copied += 1
                    logger.info(
                        "Step 4.5: Copied %d instance asset image(s) to %s",
                        copied, source_assets_path,
                    )
                else:
                    logger.debug("No assets folder found in instance mockdata; skipping asset copy")

        # Execute data append
        modified_db_path = os.path.join(db_forge_dir, "modify.db")
        try:
            success = db_validator.execute_data_append(current_db_path, modified_db_path, source_path)
        except Exception as e:
            raise Exception(f"Failed to merge data: {e}") from e
        if not success:
            raise Exception(
                f"Failed to merge data for {adb.bundle_id}. "
                f"Source: {source_path}, files: {list(resolved_mockdata.keys())}"
            )
        
        # Step 4b: Sync rootstore with merged DB data
        self._sync_rootstore_after_merge(
            current_json_path, modified_db_path, adb, resolved_mockdata
        )

        # Steps 5-8: push, let the app reload, persist, and confirm the injected
        # rows actually survived.
        #
        # The app reloads its profile data asynchronously, so a push that lands
        # while that reload is still in flight is overwritten and the injected
        # rows vanish. Measured at roughly 1 reset in 5, concentrated on the
        # first reset after the app has been idle. This used to pass silently --
        # the old check logged table row counts and swallowed every error -- so
        # the scenario ran against a state missing the record its task names,
        # and every rollout failed as "impossible". Verify the rows and retry
        # the whole push/reload/persist cycle instead.
        attempts = int(os.environ.get("DIGIWORLD_MOCKDATA_PUSH_ATTEMPTS", "3"))
        last_missing: List[str] = []
        for attempt in range(1, attempts + 1):
            logger.info(
                "Step 5: Pushing merged database to device (attempt %d/%d)...",
                attempt, attempts,
            )
            if not adb.push_modified_db_to_device(modified_db_path):
                raise Exception("Failed to push modified database to device")

            # Step 6: Wait for app to finish processing the dbrefresh
            # (push_modified_db_to_device already dispatches dbrefresh internally)
            logger.info("Step 6: Waiting for app to process dbrefresh...")
            adb.wait_for_ready()
            # Extra settle time for apps that reload data asynchronously (e.g. auction loadAllData)
            time.sleep(3)

            logger.info("Step 7: Persisting initial state for verification...")
            # Persist the state to a sessions directory so it can be used for verification later
            initial_session_id = adb.persist_state(use_default_session=False)

            # Construct path to the persisted sessions directory
            sessions_path = os.path.join(
                adb.backup_dir,
                adb.current_data_id,
                "sessions",
                initial_session_id
            )

            # Step 8: Validate persisted DB exists and contains injected data
            db_path = os.path.join(sessions_path, f"{initial_session_id}.db")
            if not os.path.exists(db_path):
                raise FileNotFoundError(
                    f"Persisted DB not found at {db_path} after mockdata injection"
                )

            last_missing = self._missing_injected_rows(db_path, resolved_mockdata)
            if not last_missing:
                logger.info("Mockdata append completed successfully!")
                logger.info(f"Initial state persisted to: {sessions_path}")
                return sessions_path, initial_session_id

            logger.warning(
                "Injected rows missing after push (attempt %d/%d): %s",
                attempt, attempts, "; ".join(last_missing),
            )

        raise Exception(
            "Mockdata injection did not survive the dbrefresh after "
            f"{attempts} attempts for {adb.bundle_id}. Missing: "
            + "; ".join(last_missing)
        )

    # Fields, in priority order, used to identify an injected row in the
    # persisted database. The first one present on a row is the one checked.
    _ROW_IDENTITY_FIELDS = (
        "name", "title", "subject", "contact_name", "account_name",
        "accountName", "contactName", "nickname", "label",
    )

    def _missing_injected_rows(
        self, db_path: str, resolved_mockdata: Dict[str, Any]
    ) -> List[str]:
        """Return a description of injected rows absent from *db_path*.

        Only rows carrying one of ``_ROW_IDENTITY_FIELDS`` are checked, and only
        when the target table and column exist -- anything less identifiable is
        reported as present so this never fails a scenario it cannot actually
        assess.
        """
        missing: List[str] = []
        try:
            conn = sqlite3.connect(db_path)
        except Exception as e:
            logger.warning("Could not open persisted DB for validation: %s", e)
            return []
        try:
            for filename, rows in resolved_mockdata.items():
                if not isinstance(rows, list):
                    continue
                table = (
                    filename.replace("mock-", "").replace(".json", "").replace("-", "_")
                )
                try:
                    cols = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
                    total = conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]
                except Exception:
                    continue  # unknown table -- nothing to assert
                if not cols:
                    continue
                logger.info("Post-persist: %s has %d rows", table, total)
                for row in rows:
                    if not isinstance(row, dict):
                        continue
                    field = next(
                        (f for f in self._ROW_IDENTITY_FIELDS if row.get(f)), None
                    )
                    if field is None:
                        continue
                    # mockdata uses camelCase, the schema snake_case
                    snake = re.sub(r"(?<!^)(?=[A-Z])", "_", field).lower()
                    col = field if field in cols else (snake if snake in cols else None)
                    if col is None:
                        continue
                    value = row[field]
                    try:
                        found = conn.execute(
                            f"SELECT COUNT(*) FROM {table} WHERE {col} = ?", (value,)
                        ).fetchone()[0]
                    except Exception:
                        continue
                    if not found:
                        missing.append(f"{table}.{col}={value!r}")
        finally:
            conn.close()
        return missing
    
    # ------------------------------------------------------------------
    # Rootstore ↔ DB synchronisation
    # ------------------------------------------------------------------

    # Maps bundle_id → {rootstore_array_path: db_table_name}.
    # Only tables whose data lives in rootstore AND in SQLite need to
    # be listed here.  The handler reads *all* rows from the merged DB
    # and replaces the rootstore array so both sides are in sync.
    _ROOTSTORE_TABLE_MAP: Dict[str, Dict[str, str]] = {
        "com.andojosmarthome.sbx": {
            "smartHomeStore.devices": "devices",
            "smartHomeStore.rooms": "rooms",
            "smartHomeStore.scenes": "scenes",
            "smartHomeStore.automations": "automations",
        },
        "com.andojobank.sbx": {
            "bankingStore.accounts": "accounts",
            "bankingStore.creditCards": "credit_cards",
            "bankingStore.billers": "billers",
            "bankingStore.zelleContacts": "zelle_contacts",
            "bankingStore.transactions": "transactions",
        },
        "com.andojopark.sbx": {
            "parkingStore.vehicles": "vehicles",
            "parkingStore.parkingZones": "parking_zones",
            "parkingStore.parkingHistory": "parking_history",
        },
        "com.andojoauction.sbx": {
            "auctionStore.items": "items",
            "auctionStore.listings": "listings",
            "auctionStore.bids": "bids",
            "auctionStore.categories": "categories",
            "auctionStore.users": "users",
            "auctionStore.transactions": "transactions",
            "auctionStore.userPaymentMethods": "user_payment_methods",
        },
        "com.andojoshop.sbx": {
            "shopStore.products": "products",
        },
        "com.andojoqwikshop.sbx": {
            "productStore.products": "products",
        },
    }

    def _sync_rootstore_after_merge(
        self,
        rootstore_path: str,
        db_path: str,
        adb: Any,
        resolved_mockdata: Dict[str, Any],
    ) -> None:
        """Update rootstore arrays so they match the merged DB.

        Some apps (smarthome, ecommerce) use a MobX rootstore as the
        primary data source and hydrate the DB from it on startup.  If we
        only inject rows into the DB, the app overwrites them on the next
        refresh.  This method reads the tables back from the merged DB
        and patches the rootstore JSON accordingly.

        The modified rootstore is pushed to the device alongside the DB.
        """
        mapping = self._ROOTSTORE_TABLE_MAP.get(adb.bundle_id)
        if not mapping:
            return  # nothing to sync for this app

        if not os.path.exists(rootstore_path):
            logger.debug("No rootstore file to sync at %s", rootstore_path)
            return

        try:
            with open(rootstore_path, "r") as f:
                rootstore = json.load(f)
        except Exception as exc:
            logger.warning("Could not read rootstore for sync: %s", exc)
            return

        # Load per-app record transformers that convert snake_case DB rows
        # to the camelCase format expected by the rootstore.
        from digiworld.config.discovery import _discover
        record_transformers: Dict[str, Any] = {}
        for _app_name, mod in _discover().items():
            if getattr(mod, "BUNDLE_ID", "") == adb.bundle_id:
                record_transformers = getattr(mod, "RECORD_TRANSFORMERS", {})
                break

        changed = False
        try:
            conn = sqlite3.connect(db_path)
            conn.row_factory = sqlite3.Row
            for rs_path, table_name in mapping.items():
                # Only sync if mockdata was injected for a file that maps to this table
                related_files = [fn for fn in resolved_mockdata if table_name in fn.replace("mock-", "").replace(".json", "").replace("-", "_")]
                if not related_files:
                    continue

                try:
                    rows = conn.execute(f"SELECT * FROM {table_name}").fetchall()
                except Exception:
                    continue

                records = [dict(r) for r in rows]

                # Apply record transformer if available (converts snake_case → camelCase)
                transformer = record_transformers.get(rs_path)
                if transformer:
                    transformed = []
                    for rec in records:
                        try:
                            # DB rows use snake_case but transformers may
                            # expect camelCase.  Inject camelCase aliases so
                            # both conventions work without modifying every
                            # transformer.
                            enriched = dict(rec)
                            for key in list(rec.keys()):
                                if "_" in key:
                                    parts = key.split("_")
                                    camel = parts[0] + "".join(
                                        p.capitalize() for p in parts[1:]
                                    )
                                    if camel not in enriched:
                                        enriched[camel] = rec[key]
                            transformed.append(transformer(enriched))
                        except Exception:
                            transformed.append(rec)
                    records = transformed

                # Navigate to the parent and set the array
                parts = rs_path.split(".")
                obj = rootstore
                for part in parts[:-1]:
                    obj = obj.setdefault(part, {})
                obj[parts[-1]] = records
                changed = True
                logger.info(
                    "Synced rootstore %s with %d records from %s",
                    rs_path, len(records), table_name,
                )

                # Also sync mirror path (userStore.X mirrors X)
                mirror_path = f"userStore.{rs_path}"
                mirror_parts = mirror_path.split(".")
                mirror_obj = rootstore
                try:
                    for part in mirror_parts[:-1]:
                        mirror_obj = mirror_obj[part]
                    if mirror_parts[-1] in mirror_obj:
                        mirror_obj[mirror_parts[-1]] = records
                        logger.info("Synced mirror rootstore %s", mirror_path)
                except (KeyError, TypeError):
                    pass  # mirror path doesn't exist, skip

            # Special handling: sync userStore.currentUser.wishlistIds for qwikshop.
            # The wishlists table is not in _ROOTSTORE_TABLE_MAP because wishlistIds
            # is a flat array of product IDs (not a full object array), so it needs
            # per-user filtering.  Without this, the dbrefresh restores the user from
            # a snapshot that has no wishlistIds, and the wishlist screen shows empty.
            if adb.bundle_id == "com.andojoqwikshop.sbx":
                wishlist_files = [fn for fn in resolved_mockdata if "wishlist" in fn.lower()]
                if wishlist_files:
                    current_user = rootstore.get("userStore", {}).get("currentUser")
                    if current_user:
                        user_id = current_user.get("id")
                        if user_id:
                            try:
                                rows = conn.execute(
                                    "SELECT product_id FROM wishlists WHERE user_id = ?",
                                    (user_id,),
                                ).fetchall()
                                wishlist_ids = [row[0] for row in rows]
                                current_user["wishlistIds"] = wishlist_ids
                                changed = True
                                logger.info(
                                    "Synced userStore.currentUser.wishlistIds with %d product IDs from wishlists table",
                                    len(wishlist_ids),
                                )
                            except Exception as e:
                                logger.warning("Failed to sync qwikshop wishlists: %s", e)

            conn.close()
        except Exception as exc:
            logger.warning("Rootstore sync failed: %s", exc)
            return

        if changed:
            # Clear MST reference fields that may point to stale IDs
            # after the DB merge (e.g., selectedItem pointing to an
            # item that was in the DB before but now has a different ID)
            _REF_FIELDS_TO_CLEAR = {
                "com.andojoauction.sbx": {
                    "auctionStore": ["selectedItem", "selectedCategory"],
                },
            }
            for store_key, fields in _REF_FIELDS_TO_CLEAR.get(adb.bundle_id, {}).items():
                store = rootstore.get(store_key, {})
                for field in fields:
                    if field in store:
                        store[field] = None

            try:
                with open(rootstore_path, "w") as f:
                    json.dump(rootstore, f, indent=2)
                # Push updated rootstore to device
                remote_json = f"{adb.device_base_path}/db-forge/current.json"
                adb.backend.push_file(rootstore_path, remote_json)
                logger.info("Pushed synced rootstore to device")
            except Exception as exc:
                logger.warning("Failed to push synced rootstore: %s", exc)

    def _get_instance_mockdata_path(self) -> str:
        """
        Get the path to instance-specific mockdata.
        
        Returns:
            str: Path to instance mockdata directory, or None if not found
        """
        current_file = inspect.getfile(self.scenario.__class__)
        scenario_dir = Path(current_file).parent
        
        instance_mockdata_path = scenario_dir / "instances" / self.scenario.instance_tag / "mockdata"
        return str(instance_mockdata_path) if instance_mockdata_path.exists() else None
    
    def _resolve_templates_in_mockdata(self, adb, db_path: str) -> Dict[str, List[Dict]]:
        """
        Load mockdata files and resolve all templates.

        Args:
            adb: ADBActions instance for context
            db_path: Path to the current database for context extraction

        Returns:
            Dict mapping filenames to resolved JSON data (e.g., {"mock-emails.json": [...]})
        """
        # Collect mockdata paths - ONLY instance mockdata should be appended
        # Profile mockdata is already in the database from adb.set_environment()
        all_mockdata_paths = []
        
        # Add instance mockdata if it exists
        if self.scenario.instance_tag:
            instance_mockdata_path = self._get_instance_mockdata_path()
            if instance_mockdata_path and os.path.exists(instance_mockdata_path):
                all_mockdata_paths.append(instance_mockdata_path)
                logger.debug(f"Found instance mockdata at: {instance_mockdata_path}")
            else:
                logger.debug(f"No instance mockdata found for tag: {self.scenario.instance_tag}")
        
        if not all_mockdata_paths:
            logger.info("No mockdata paths found")
            return {}
        
        # Auto-detect which template fields are needed by scanning mockdata files
        required_template_fields = self._detect_required_template_fields(all_mockdata_paths)
        logger.info(f"Auto-detected template fields needed: {required_template_fields}")
        
        # Extract context for template resolution (separate from agent context_fields)
        user_context = self._extract_context_for_templates(db_path, required_template_fields)
        
        # Get scenario-specific positioning data
        positioning_data = self.scenario._get_positioning_data(db_path)
        
        # Set the db_path on the scenario so template resolvers can access it
        self.scenario._current_db_path = db_path
        
        # Create template resolver
        template_resolver = self.scenario._create_template_resolver(user_context, positioning_data)
        
        # Collect and resolve mockdata with templates
        resolved_mockdata = self._collect_and_resolve_mockdata(all_mockdata_paths, template_resolver)
        
        return resolved_mockdata
    
    def _detect_required_template_fields(self, mockdata_paths: List[str]) -> Set[str]:
        """
        Scan mockdata files to detect which template fields are needed for resolution.
        
        This auto-detects templates like {{current_user_email}}, {{auto_id}}, etc.
        from the mockdata JSON files, so we know what context to extract.
        
        Args:
            mockdata_paths: List of paths to mockdata directories
            
        Returns:
            Set of template field names found in the mockdata
        """
        required_fields = set()
        
        # Pattern to match {{field_name}} templates (both single and double brace)
        template_pattern = re.compile(r'\{\{(\w+)\}\}|\{(\w+)\}')
        
        for mockdata_path in mockdata_paths:
            if not os.path.exists(mockdata_path):
                continue
            
            for filename in os.listdir(mockdata_path):
                if not filename.endswith('.json'):
                    continue
                    
                filepath = os.path.join(mockdata_path, filename)
                with open(filepath, 'r') as f:
                    content = f.read()
                    matches = template_pattern.findall(content)
                    # findall returns tuples for groups, extract non-empty matches
                    for match in matches:
                        field = match[0] or match[1]  # One of the groups will be non-empty
                        if field:
                            required_fields.add(field)
        
        return required_fields
    
    def _extract_context_for_templates(self, db_path: str, detected_templates: Set[str]) -> Dict[str, Any]:
        """
        Extract context needed for template resolution.
        
        This extracts only the fields actually needed by templates,
        independent of the scenario's context_fields (which controls what the agent sees).
        
        Uses the template resolver's declared CONTEXT_DEPENDENCIES to determine
        what needs to be extracted, keeping app-specific logic in the resolvers.
        
        Args:
            db_path: Path to the database file
            detected_templates: Set of template names found in mockdata
            
        Returns:
            Dict containing the extracted context for template resolution
        """
        user_context = {}
        
        # Get the resolver class to check its declared dependencies
        resolver_class = self._get_template_resolver_class()
        
        # Query the resolver for what context is needed for the detected templates
        required_context = resolver_class.get_required_context(detected_templates)
        logger.info(f"Resolver {resolver_class.__name__} requires context: {required_context}")
        
        # Check if we need basic user info from rootstore
        needs_user_info = bool(required_context & {'current_user_email', 'current_user_id'})
        
        if needs_user_info:
            db_dir = os.path.dirname(db_path)
            # Check for both current.json (db-forge) and rootstore.json (sessions)
            rootstore_path = os.path.join(db_dir, "current.json")
            if not os.path.exists(rootstore_path):
                rootstore_path = os.path.join(db_dir, "rootstore.json")
            
            if os.path.exists(rootstore_path):
                from digiworld.scenarios.state_manager import StateManager
                state_manager = StateManager(self.scenario)
                current_user_id, current_user_email = state_manager.get_current_user_info(rootstore_path)

                if current_user_email:
                    user_context['current_user_email'] = current_user_email
                    user_context['current_user_id'] = current_user_id
                    logger.info(f"Extracted user context for templates: {current_user_email} (ID: {current_user_id})")
                else:
                    logger.warning(f"Could not extract user info from {rootstore_path} for template resolution")
            else:
                logger.warning(f"No rootstore file found at {db_dir} for template resolution")

            # Fallback: query user ID from the database if rootstore extraction failed
            if 'current_user_id' not in user_context and os.path.exists(db_path):
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute("SELECT id, email FROM users ORDER BY id LIMIT 1")
                    row = cursor.fetchone()
                    conn.close()
                    if row:
                        user_context['current_user_id'] = row[0]
                        user_context['current_user_email'] = row[1] or ''
                        logger.info(f"Fallback: extracted user context from DB: ID={row[0]}, email={row[1]}")
                except Exception as e:
                    logger.warning(f"DB fallback for user context failed: {e}")
        
        # Handle templates that require database extraction
        db_extraction_requirements = resolver_class.get_db_extraction_requirements(detected_templates)
        for template_name, method_name in db_extraction_requirements.items():
            if hasattr(self, method_name):
                extraction_method = getattr(self, method_name)
                user_id = user_context.get('current_user_id')
                if user_id:
                    value = extraction_method(db_path, user_id)
                    if value:
                        user_context[template_name] = value
                else:
                    logger.warning(f"Cannot extract {template_name}: current_user_id not available")
        
        return user_context
    
    def _get_template_resolver_class(self):
        """
        Get the template resolver class that will be used for this scenario.
        
        This allows us to query the resolver's CONTEXT_DEPENDENCIES before
        instantiating it.
        """
        # The scenario's _create_template_resolver method knows which resolver to use,
        # but we need the class, not an instance. We can infer it from the scenario type.
        from digiworld.scenarios.template_resolver import TemplateResolver
        
        # Check for app-specific resolvers based on scenario class hierarchy
        scenario_class = self.scenario.__class__
        
        # Walk through base classes to find the app's base scenario
        for base in scenario_class.__mro__:
            base_name = base.__name__
            
            if 'EmailScenario' in base_name:
                from digiworld.scenarios.scenarios.email.template_resolver import EmailTemplateResolver
                return EmailTemplateResolver
            elif 'PaymentScenario' in base_name:
                from digiworld.scenarios.scenarios.payment.template_resolver import PaymentTemplateResolver
                return PaymentTemplateResolver
            elif 'SmartHomeScenario' in base_name:
                from digiworld.scenarios.scenarios.smarthome.template_resolver import SmartHomeTemplateResolver
                return SmartHomeTemplateResolver
            elif 'MessageScenario' in base_name:
                from digiworld.scenarios.scenarios.message.template_resolver import MessageTemplateResolver
                return MessageTemplateResolver
            elif 'VideoScenario' in base_name:
                from digiworld.scenarios.scenarios.video.template_resolver import VideoTemplateResolver
                return VideoTemplateResolver
            elif 'MusicScenario' in base_name:
                from digiworld.scenarios.scenarios.music.template_resolver import MusicTemplateResolver
                return MusicTemplateResolver
            elif 'EatsScenario' in base_name:
                from digiworld.scenarios.scenarios.eats.template_resolver import EatsTemplateResolver
                return EatsTemplateResolver
            elif 'EcommerceScenario' in base_name:
                from digiworld.scenarios.scenarios.ecommerce.template_resolver import EcommerceTemplateResolver
                return EcommerceTemplateResolver
            elif 'RydeScenario' in base_name:
                from digiworld.scenarios.scenarios.ryde.template_resolver import RydeTemplateResolver
                return RydeTemplateResolver
            elif 'AuctionScenario' in base_name:
                from digiworld.scenarios.scenarios.auction.template_resolver import AuctionTemplateResolver
                return AuctionTemplateResolver
            elif 'BankingScenario' in base_name:
                from digiworld.scenarios.scenarios.banking.template_resolver import BankingTemplateResolver
                return BankingTemplateResolver
            elif 'FlightBookingScenario' in base_name:
                from digiworld.scenarios.scenarios.flightbooking.template_resolver import FlightBookingTemplateResolver
                return FlightBookingTemplateResolver
            elif 'ParkingScenario' in base_name:
                from digiworld.scenarios.scenarios.parking.template_resolver import ParkingTemplateResolver
                return ParkingTemplateResolver
            elif 'QwikshopScenario' in base_name:
                from digiworld.scenarios.scenarios.qwikshop.template_resolver import QwikshopTemplateResolver
                return QwikshopTemplateResolver
            elif 'TransitScenario' in base_name:
                from digiworld.scenarios.scenarios.transit.template_resolver import TransitTemplateResolver
                return TransitTemplateResolver
        
        # Default to base resolver
        return TemplateResolver
    
    def _extract_user_pin(self, db_path: str, user_id: str) -> str:
        """
        Extract user PIN from database for template resolution.
        
        Args:
            db_path: Path to the database file
            user_id: User ID to look up
            
        Returns:
            PIN as string, or None if not found
        """
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("SELECT pin FROM users WHERE id = ?", (user_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                pin = str(result[0])
                logger.info(f"Extracted user PIN for template resolution")
                return pin
            else:
                logger.warning(f"No PIN found for user ID {user_id}")
                return None
        except Exception as e:
            logger.warning(f"Error extracting user PIN: {e}")
            return None
    
    def _collect_and_resolve_mockdata(self, mockdata_paths: List[str], template_resolver: TemplateResolver) -> Dict[str, Any]:
        """
        Collect and resolve templated mockdata.
        
        Returns:
            Dict mapping filenames to resolved data (e.g., {"mock-emails.json": [...]})
        """
        all_mock_data = {}
        self._asset_placeholder_id_map = {}
        
        for mockdata_path in mockdata_paths:
            if not os.path.exists(mockdata_path):
                continue
                
            json_files = [f for f in os.listdir(mockdata_path) if f.endswith('.json')]
            logger.debug(f"Processing {len(json_files)} mockdata files from {mockdata_path}")
            
            for json_file in json_files:
                with open(os.path.join(mockdata_path, json_file), 'r') as f:
                    raw_data = json.load(f)
                    
                    resolved_data = template_resolver.resolve_object(raw_data)
                    self._record_asset_placeholder_ids(json_file, raw_data, resolved_data)
                    logger.debug(f"Resolved templates in {json_file}")
                    
                    # Merge data for the same file (in case multiple paths have same file)
                    if json_file in all_mock_data:
                        if isinstance(all_mock_data[json_file], list) and isinstance(resolved_data, list):
                            all_mock_data[json_file].extend(resolved_data)
                        else:
                            logger.warning(f"Conflicting data types for {json_file}")
                    else:
                        all_mock_data[json_file] = resolved_data
        
        return all_mock_data

    def _record_asset_placeholder_ids(
        self,
        json_file: str,
        raw_data: Any,
        resolved_data: Any,
    ) -> None:
        """Remember how templated record IDs resolved for asset folder names.

        Scenario assets are staged before they are pushed to the device.  If an
        instance uses an ID template like ``{{auto_id}}``, authors can place the
        image at ``assets/<entity>/{{auto_id}}/main.jpg`` and this map lets the
        copy step rename that folder to the resolved database ID.
        """
        if not isinstance(raw_data, list) or not isinstance(resolved_data, list):
            return

        candidate_folders = self._asset_folder_candidates_for_mock_file(json_file)
        placeholder_map = getattr(self, "_asset_placeholder_id_map", {})

        for raw_record, resolved_record in zip(raw_data, resolved_data):
            if not isinstance(raw_record, dict) or not isinstance(resolved_record, dict):
                continue
            raw_id = raw_record.get("id")
            resolved_id = resolved_record.get("id")
            if not (
                isinstance(raw_id, str)
                and "{{" in raw_id
                and "}}" in raw_id
                and resolved_id is not None
            ):
                continue

            for folder in candidate_folders:
                folder_map = placeholder_map.setdefault(folder, {})
                folder_map.setdefault(raw_id, []).append(str(resolved_id))

        self._asset_placeholder_id_map = placeholder_map

    def _asset_folder_candidates_for_mock_file(self, json_file: str) -> List[str]:
        """Return likely asset folders for a mockdata JSON file."""
        base = json_file.replace("mock-", "").replace(".json", "").replace("-", "_")
        candidates = [base]

        if not base.endswith("s"):
            candidates.append(f"{base}s")
        else:
            candidates.append(base.rstrip("s"))

        aliases = {
            "menu_items": ["menu"],
            "categories": ["music_categories"],
            "users": ["avatars"],
        }
        candidates.extend(aliases.get(base, []))

        # Preserve order while removing duplicates.
        return list(dict.fromkeys(candidate for candidate in candidates if candidate))

    def _resolve_asset_relative_path(self, rel_path: str) -> str:
        """Resolve templated path components in staged asset paths.

        Fixed-ID paths pass through unchanged.  For paths like
        ``playlists/{{auto_id}}/main.jpg``, the entity folder (``playlists``)
        is used to find the matching resolved record ID.
        """
        placeholder_map = getattr(self, "_asset_placeholder_id_map", {})
        if not placeholder_map or "{{" not in rel_path:
            return rel_path

        parts = rel_path.split(os.sep)
        if not parts:
            return rel_path

        entity_folder = parts[0]
        folder_map = placeholder_map.get(entity_folder, {})
        changed = False

        for idx, part in enumerate(parts):
            if "{{" not in part or "}}" not in part:
                continue

            resolved_values = folder_map.get(part)
            if not resolved_values:
                # Fall back to a globally unique placeholder resolution if the
                # entity folder alias was not detected.
                all_values = []
                for candidate_map in placeholder_map.values():
                    all_values.extend(candidate_map.get(part, []))
                unique_values = list(dict.fromkeys(all_values))
                resolved_values = unique_values if len(unique_values) == 1 else []

            if not resolved_values:
                logger.warning(
                    "Could not resolve asset placeholder %s in %s; copying as-is",
                    part,
                    rel_path,
                )
                continue

            if len(set(resolved_values)) > 1:
                logger.warning(
                    "Asset placeholder %s in %s resolved to multiple IDs %s; using %s",
                    part,
                    rel_path,
                    resolved_values,
                    resolved_values[0],
                )

            parts[idx] = resolved_values[0]
            changed = True

        return os.path.join(*parts) if changed else rel_path

