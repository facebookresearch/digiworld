# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Post-generation mockdata validator.

Validates generated mockdata files against profile DB schemas at
generation time, catching errors that would otherwise only surface
at runtime on a device. Also auto-derives constraints from template
placeholders that require DB queries.
"""

import json
import logging
import re
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

from digiworld.app_registry import APP_REGISTRY
from digiworld.scenarios.constraints import Constraint, EntityExistsConstraint

logger = logging.getLogger(__name__)

# ======================================================================
# Template registry
# ======================================================================

BASE_TEMPLATES: Set[str] = {
    "auto_id",
    "current_user_email",
    "current_user_id",
    "current_user_pin",
    "current_user_name",
    "recent_timestamp",
    "past_timestamp",
    "middle_timestamp",
    "earliest_timestamp",
    "latest_timestamp",
    "random_phone",
    "random_birth_date",
    "context_sender_avatar",
}

# Per-app templates supported by each app's TemplateResolver subclass.
# Entries ending with ':*' are parameterized (e.g., context_sender:work).
APP_TEMPLATES: Dict[str, Set[str]] = {
    "email": {
        "beginning_timestamp",
        "end_timestamp",
        "context_sender:*",
        "context_sender_first_name:*",
        "context_sender_last_name:*",
        "context_sender_display_name:*",
        "context_sender_signature:*",
    },
    "payment": {
        "middle_transaction_time",
        "recent_transaction_time",
        "old_transaction_time",
        "small_amount",
        "medium_amount",
        "large_amount",
        "contextual_amount",
        "current_balance",
        "safe_amount",
        "context_contact_email:*",
        "context_contact_name:*",
        "context_contact_first_name:*",
        "context_contact_last_name:*",
        "payment_description:*",
    },
    "smarthome": {
        "first_room_id",
        "room_id_by_name:*",
        "device_type_id_by_name:*",
    },
    "video": {
        "current_user_channel_id",
    },
    "banking": {
        "beginning_timestamp",
        "end_timestamp",
    },
    "flightbooking": {
        "beginning_timestamp",
        "end_timestamp",
    },
    "parking": {
        "beginning_timestamp",
        "end_timestamp",
    },
    "transit": {
        "beginning_timestamp",
        "end_timestamp",
    },
    "ecommerce": {
        "current_user_cart_id",
    },
    "qwikshop": {
        "beginning_timestamp",
        "end_timestamp",
    },
    "message": {
        "middle_message_time",
        "recent_message_time",
        "old_message_time",
        "casual_message",
        "work_message",
        "question_message",
        "context_contact_name:*",
    },
    "auction": {
        "current_user_password",
        "future_end_time",
    },
    "ryde": {
        "middle_ride_time",
        "recent_ride_time",
        "old_ride_time",
    },
}

# Templates that require DB queries at runtime. Maps template name to a
# constraint that must be satisfied for the template to resolve.
TEMPLATE_DB_REQUIREMENTS: Dict[str, Constraint] = {
    "first_room_id": EntityExistsConstraint(table="rooms", user_filter=True, min_count=1),
    "room_id_by_name:*": EntityExistsConstraint(table="rooms", user_filter=True, min_count=1),
    "current_user_channel_id": EntityExistsConstraint(table="channels", user_filter=True, min_count=1),
    "current_user_pin": EntityExistsConstraint(table="users", min_count=1),
}

# Positioning templates that query a specific table. The value is the table name.
_POSITIONING_TABLE: Dict[str, str] = {
    "beginning_timestamp": None,  # app-dependent; checked per-app below
    "middle_timestamp": None,
    "end_timestamp": None,
    "middle_transaction_time": "transactions",
    "recent_transaction_time": "transactions",
    "old_transaction_time": "transactions",
    "middle_message_time": "messages",
    "recent_message_time": "messages",
    "old_message_time": "messages",
    "middle_ride_time": "rides",
    "recent_ride_time": "rides",
    "old_ride_time": "rides",
}

# Per-app positioning table for beginning/middle/end_timestamp overrides
_APP_POSITIONING_TABLE: Dict[str, str] = {
    "email": "emails",
    "banking": "transactions",
    "flightbooking": "bookings",
    "parking": "vehicles",
    "transit": "saved_routes",
    "qwikshop": "orders",
}


# ======================================================================
# Validator
# ======================================================================

_TEMPLATE_RE = re.compile(r"\{\{([^{}]+)\}\}")


class MockdataValidator:
    """Validate generated mockdata files against profile DB schemas."""

    def __init__(self, state_data_dir: Path):
        self._state_data_dir = state_data_dir
        self._table_config_cache: Dict[str, Dict[str, str]] = {}

    def _resolve_table_name(self, filename: str, app_name: str) -> str:
        """Resolve the DB table name for a mockdata filename.

        Uses TABLE_CONFIGS from discovery when available,
        falling back to ``mock-X.json -> X`` derivation.
        """
        if app_name not in self._table_config_cache:
            mapping: Dict[str, str] = {}
            try:
                from digiworld.config.discovery import (
                    get_all_app_configs,
                )
                configs = get_all_app_configs()
                mod = configs.get(app_name)
                if mod is not None:
                    for tc in getattr(mod, "TABLE_CONFIGS", []):
                        mapping[tc.source_file] = tc.table_name
            except Exception:
                pass
            self._table_config_cache[app_name] = mapping

        configured = self._table_config_cache[app_name].get(filename)
        if configured:
            return configured
        # Fallback: derive from filename
        stem = filename.replace("mock-", "").replace(".json", "")
        return stem.replace("-", "_")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(self, mockdata_dir: Path, app_name: str) -> None:
        """Run all validation checks on the mockdata in *mockdata_dir*.

        Raises ``ValueError`` on the first validation failure.
        """
        db_path = self._get_any_profile_db(app_name)
        if db_path is None:
            logger.warning(
                "No profile DB found for app '%s'; skipping mockdata validation",
                app_name,
            )
            return

        try:
            conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
            conn.execute("SELECT 1 FROM sqlite_master LIMIT 1")
        except (sqlite3.DatabaseError, sqlite3.OperationalError):
            logger.warning(
                "Cannot open profile DB at %s (LFS pointer or corrupt); "
                "skipping schema validation, still checking template keys",
                db_path,
            )
            for json_file in sorted(mockdata_dir.glob("mock-*.json")):
                records = json.loads(json_file.read_text())
                if isinstance(records, list) and records:
                    templates_found = self._scan_templates(records)
                    self._check_template_keys(templates_found, app_name, json_file.name)
            return

        try:
            for json_file in sorted(mockdata_dir.glob("mock-*.json")):
                records = json.loads(json_file.read_text())
                if not isinstance(records, list) or not records:
                    continue

                table_name = self._resolve_table_name(json_file.name, app_name)
                self._check_table_exists(conn, table_name, json_file.name)

                schema = self._get_table_schema(conn, table_name)
                if schema:
                    for record in records:
                        self._check_columns(record, schema, table_name, json_file.name)
                        self._check_types(record, schema, table_name, json_file.name)

                templates_found = self._scan_templates(records)
                self._check_template_keys(templates_found, app_name, json_file.name)
        finally:
            conn.close()

    def derive_template_constraints(
        self, mockdata_dir: Path, app_name: str
    ) -> List[Constraint]:
        """Scan mockdata for templates and return auto-derived constraints."""
        all_templates: Set[str] = set()
        for json_file in mockdata_dir.glob("mock-*.json"):
            records = json.loads(json_file.read_text())
            if isinstance(records, list):
                all_templates.update(self._scan_templates(records))

        derived: List[Constraint] = []
        seen_descs: Set[str] = set()

        for tmpl in all_templates:
            constraint = self._lookup_template_constraint(tmpl, app_name)
            if constraint is not None:
                desc = constraint.describe()
                if desc not in seen_descs:
                    derived.append(constraint)
                    seen_descs.add(desc)

        return derived

    # ------------------------------------------------------------------
    # Validation checks
    # ------------------------------------------------------------------

    @staticmethod
    def _check_table_exists(conn: sqlite3.Connection, table_name: str, filename: str) -> None:
        row = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
            (table_name,),
        ).fetchone()
        if row is None:
            raise ValueError(
                f"Mockdata file '{filename}' maps to table '{table_name}' "
                f"which does not exist in the profile database"
            )

    @staticmethod
    def _get_table_schema(
        conn: sqlite3.Connection, table_name: str
    ) -> Dict[str, Tuple[str, bool, Any, bool]]:
        """Return {col_name: (type, not_null, default, is_pk)}."""
        rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        schema: Dict[str, Tuple[str, bool, Any, bool]] = {}
        for row in rows:
            _, col_name, col_type, not_null, default_val, pk = row
            schema[col_name] = (col_type, bool(not_null), default_val, bool(pk))
        return schema

    def _check_columns(
        self,
        record: Dict[str, Any],
        schema: Dict[str, Tuple],
        table_name: str,
        filename: str,
    ) -> None:
        db_columns = set(schema.keys())
        for key in record:
            if key in db_columns:
                continue
            snake = _camel_to_snake(key)
            if snake in db_columns:
                continue
            # Skip nested objects/arrays -- they may be JSON-stringified at insert time
            if isinstance(record[key], (dict, list)):
                continue
            raise ValueError(
                f"Field '{key}' in {filename} has no corresponding column "
                f"in table '{table_name}'. Available columns: {sorted(db_columns)}"
            )

    def _check_types(
        self,
        record: Dict[str, Any],
        schema: Dict[str, Tuple],
        table_name: str,
        filename: str,
    ) -> None:
        for key, value in record.items():
            if isinstance(value, str) and _TEMPLATE_RE.search(value):
                continue
            col_name = key if key in schema else _camel_to_snake(key)
            if col_name not in schema:
                continue
            col_type = schema[col_name][0].upper()
            if value is None:
                continue
            if col_type in ("INTEGER", "INT", "BIGINT") and not isinstance(value, (int, bool)):
                if isinstance(value, float) and value == int(value):
                    continue
                logger.warning(
                    "Type mismatch in %s: field '%s' is %s but column '%s' "
                    "expects %s (value: %r)",
                    filename, key, type(value).__name__, col_name, col_type, value,
                )

    def _check_template_keys(
        self, templates: Set[str], app_name: str, filename: str
    ) -> None:
        app_tmpls = APP_TEMPLATES.get(app_name, set())
        for tmpl in templates:
            if tmpl in BASE_TEMPLATES:
                continue
            if tmpl in app_tmpls:
                continue
            # Check parameterized patterns (e.g., context_sender:work matches context_sender:*)
            base_key = tmpl.split(":")[0] + ":*" if ":" in tmpl else None
            if base_key and (base_key in BASE_TEMPLATES or base_key in app_tmpls):
                continue
            raise ValueError(
                f"Unrecognized template placeholder '{{{{{tmpl}}}}}' in {filename} "
                f"for app '{app_name}'. Known base templates: {sorted(BASE_TEMPLATES)}. "
                f"Known app templates: {sorted(app_tmpls)}"
            )

    # ------------------------------------------------------------------
    # Template scanning
    # ------------------------------------------------------------------

    @classmethod
    def _scan_templates(cls, records: List[Dict[str, Any]]) -> Set[str]:
        templates: Set[str] = set()
        for record in records:
            cls._scan_value(record, templates)
        return templates

    @classmethod
    def _scan_value(cls, obj: Any, templates: Set[str]) -> None:
        if isinstance(obj, str):
            for match in _TEMPLATE_RE.finditer(obj):
                templates.add(match.group(1))
        elif isinstance(obj, dict):
            for v in obj.values():
                cls._scan_value(v, templates)
        elif isinstance(obj, list):
            for v in obj:
                cls._scan_value(v, templates)

    # ------------------------------------------------------------------
    # Constraint derivation
    # ------------------------------------------------------------------

    def _lookup_template_constraint(
        self, template: str, app_name: str
    ) -> Constraint | None:
        # Direct match
        if template in TEMPLATE_DB_REQUIREMENTS:
            return TEMPLATE_DB_REQUIREMENTS[template]
        # Parameterized match
        base_key = template.split(":")[0] + ":*" if ":" in template else None
        if base_key and base_key in TEMPLATE_DB_REQUIREMENTS:
            return TEMPLATE_DB_REQUIREMENTS[base_key]

        # Positioning templates require at least 2 rows in the target table
        # so the PositioningService can compute a timestamp between existing
        # entries.  We omit user_filter because not every table uses a
        # ``user_id`` column (e.g., emails filters by "receiver").  Scenarios
        # that need user-level filtering should declare their own constraints
        # in ``feasibility.py``.
        if template in _POSITIONING_TABLE:
            table = _POSITIONING_TABLE[template]
            if table is None:
                table = _APP_POSITIONING_TABLE.get(app_name)
            if table:
                return EntityExistsConstraint(table=table, user_filter=False, min_count=2)

        return None

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_any_profile_db(self, app_name: str) -> Path | None:
        bundle_id = APP_REGISTRY[app_name]["bundle_id"]
        app_state_dir = self._state_data_dir / bundle_id
        if not app_state_dir.is_dir():
            return None
        for profile_dir in sorted(app_state_dir.iterdir()):
            db_path = profile_dir / "sessions" / "default" / "default.db"
            if db_path.exists():
                return db_path
        return None


def _camel_to_snake(name: str) -> str:
    """Convert camelCase to snake_case."""
    result = []
    for i, ch in enumerate(name):
        if ch.isupper() and i > 0:
            result.append("_")
        result.append(ch.lower())
    return "".join(result)
