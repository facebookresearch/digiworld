# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Dry-run mockdata injection simulation.

Copies a compatible profile's SQLite database to a temp directory, resolves
template placeholders in mockdata records, then INSERTs them into the DB.
Verifies the database remains valid (integrity_check) after injection.

This catches runtime failures (column mismatches, constraint violations,
type coercion issues) without needing a device or emulator.
"""

import json
import re
import shutil
import sqlite3
from pathlib import Path
from typing import Any, Dict, List

import pytest

from digiworld.scenarios.template_resolver import TemplateResolver

from .conftest import (
    STATE_DATA_DIR,
    camel_to_snake,
    db_is_valid_sqlite,
    discover_instances_with_mockdata,
    get_first_compatible_db,
    get_scenario_config,
    get_table_columns,
    load_json,
    _instance_id,
    _TEMPLATE_RE,
)


_INSTANCES_WITH_MOCKDATA = discover_instances_with_mockdata()


class _LenientTemplateResolver(TemplateResolver):
    """TemplateResolver that substitutes placeholder values for unknown templates.

    The injection test validates data *shape* (columns, types, insertability),
    not semantic correctness of resolved values.  App-specific templates
    (e.g. ``{{first_room_id}}``, ``{{recent_ride_time}}``) are replaced with
    safe dummy values so the INSERT can proceed.
    """

    _DUMMY_RE = re.compile(r"\{\{(\w+(?::\w+)?)\}\}")

    def resolve(self, template_str: str) -> str:
        if not isinstance(template_str, str) or "{{" not in template_str:
            return template_str

        try:
            return super().resolve(template_str)
        except ValueError:
            pass

        # Replace remaining unresolved templates with type-appropriate dummies
        def _sub(m: re.Match) -> str:
            name = m.group(1)
            if "id" in name:
                return str(99999)
            if "time" in name or "timestamp" in name or "date" in name:
                return "2026-01-01T00:00:00Z"
            if "email" in name:
                return "dummy@example.com"
            if "amount" in name or "balance" in name:
                return "100.00"
            if "phone" in name:
                return "+1-555-0000"
            return "dummy_value"

        return self._DUMMY_RE.sub(_sub, template_str)


def _build_minimal_user_context(conn: sqlite3.Connection) -> Dict[str, Any]:
    """Extract a minimal user context from the DB for template resolution.

    We only need enough to resolve common templates (auto_id, current_user_id,
    current_user_email, timestamps).  We do NOT try to replicate the full
    app-specific TemplateResolver -- the goal is to test that the *data shape*
    is insertable, not that every template resolves to a meaningful value.
    """
    ctx: Dict[str, Any] = {
        "current_user_id": 1,
        "current_user_email": "testuser@example.com",
    }

    # Try to read real user info from a 'users' table if present
    try:
        row = conn.execute(
            "SELECT id, email FROM users WHERE id = 1"
        ).fetchone()
        if row:
            ctx["current_user_id"] = row[0]
            if row[1]:
                ctx["current_user_email"] = row[1]
    except sqlite3.OperationalError:
        pass

    # Fallback: some apps use phoneNumber instead of email
    if ctx["current_user_email"] == "testuser@example.com":
        try:
            row = conn.execute(
                "SELECT id, phone_number FROM users WHERE id = 1"
            ).fetchone()
            if row and row[1]:
                ctx["current_user_email"] = row[1]
        except sqlite3.OperationalError:
            pass

    return ctx


def _resolve_record_for_insert(
    record: Dict[str, Any],
    resolver: TemplateResolver,
    db_columns: set,
) -> Dict[str, Any]:
    """Resolve templates and map camelCase keys to snake_case DB columns.

    Returns a dict keyed by actual DB column names with resolved values.
    Skips fields that have no matching column (e.g. nested objects that
    would be JSON-serialised by the real DataAppendEngine).
    """
    resolved: Dict[str, Any] = {}
    for key, value in record.items():
        col = key if key in db_columns else camel_to_snake(key)
        if col not in db_columns:
            continue

        if isinstance(value, str) and _TEMPLATE_RE.search(value):
            value = resolver.resolve_object(value)

        if isinstance(value, (dict, list)):
            value = json.dumps(value)

        resolved[col] = value
    return resolved


def _escape_col(name: str) -> str:
    """Wrap column name in square brackets to avoid reserved-keyword issues."""
    return f"[{name}]"


@pytest.mark.instance_integrity
class TestMockdataInjectionDryRun:
    """Copy a profile DB, inject mockdata, and verify DB integrity."""

    @pytest.mark.parametrize(
        "instance_dir", _INSTANCES_WITH_MOCKDATA, ids=_instance_id
    )
    def test_mockdata_can_be_inserted_into_profile_db(
        self, instance_dir, tmp_path
    ):
        _config, original_db = get_first_compatible_db(instance_dir)
        if not db_is_valid_sqlite(original_db):
            pytest.skip("Profile DB is not valid SQLite")

        test_db = tmp_path / "test.db"
        shutil.copy2(original_db, test_db)

        conn = sqlite3.connect(str(test_db))
        ctx = _build_minimal_user_context(conn)
        resolver = _LenientTemplateResolver(ctx)

        mockdata_dir = instance_dir / "mockdata"
        insert_errors: List[str] = []

        for json_file in sorted(mockdata_dir.glob("mock-*.json")):
            table_name = json_file.stem.replace("mock-", "").replace("-", "_")

            # Verify the table exists before attempting insert
            exists = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
                (table_name,),
            ).fetchone()
            if not exists:
                insert_errors.append(
                    f"{json_file.name}: table '{table_name}' does not exist"
                )
                continue

            db_columns = get_table_columns(conn, table_name)
            records = load_json(json_file)

            for i, raw_record in enumerate(records):
                resolved = _resolve_record_for_insert(
                    raw_record, resolver, db_columns
                )
                if not resolved:
                    insert_errors.append(
                        f"{json_file.name}[{i}]: no columns mapped"
                    )
                    continue

                cols_sql = ", ".join(_escape_col(c) for c in resolved)
                placeholders = ", ".join("?" for _ in resolved)
                sql = f"INSERT OR REPLACE INTO [{table_name}] ({cols_sql}) VALUES ({placeholders})"

                try:
                    conn.execute(sql, list(resolved.values()))
                except sqlite3.Error as exc:
                    insert_errors.append(
                        f"{json_file.name}[{i}]: INSERT failed: {exc}"
                    )

        conn.commit()

        # Verify database integrity after all inserts
        integrity = conn.execute("PRAGMA integrity_check").fetchone()
        conn.close()

        assert integrity and integrity[0] == "ok", (
            f"DB integrity check failed after mockdata injection: {integrity}"
        )
        assert not insert_errors, (
            "Mockdata insertion errors:\n" + "\n".join(insert_errors)
        )
