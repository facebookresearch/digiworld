# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Mockdata schema validation against profile databases.

For every instance that ships mockdata, validates:
- Each mock-*.json maps to a real table in the profile SQLite DB
- Record fields correspond to actual DB columns (checking camelCase -> snake_case)
- Template placeholders are recognised by the validator registry
- INTEGER columns are not given string literals (type checking)
"""

import json
import sqlite3

import pytest

from .conftest import (
    STATE_DATA_DIR,
    camel_to_snake,
    db_is_valid_sqlite,
    discover_instances_with_mockdata,
    get_first_compatible_db,
    get_db_tables,
    get_scenario_config,
    get_table_columns,
    is_known_template,
    load_json,
    scan_templates,
    _instance_id,
    _TEMPLATE_RE,
)


_INSTANCES_WITH_MOCKDATA = discover_instances_with_mockdata()


def _mockdata_files(instance_dir):
    """Yield (json_file_path, table_name, records) for each mock-*.json."""
    mockdata_dir = instance_dir / "mockdata"
    for json_file in sorted(mockdata_dir.glob("mock-*.json")):
        table_name = json_file.stem.replace("mock-", "").replace("-", "_")
        records = load_json(json_file)
        yield json_file, table_name, records


@pytest.mark.instance_integrity
class TestMockdataTablesExist:
    """Every mock-*.json must map to a real table in the profile DB."""

    @pytest.mark.parametrize(
        "instance_dir", _INSTANCES_WITH_MOCKDATA, ids=_instance_id
    )
    def test_tables_exist_in_profile_db(self, instance_dir):
        _config, db_path = get_first_compatible_db(instance_dir)
        if not db_is_valid_sqlite(db_path):
            pytest.skip(f"DB at {db_path} is not a valid SQLite file (LFS pointer?)")

        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        tables = get_db_tables(conn)
        conn.close()

        for json_file, table_name, _records in _mockdata_files(instance_dir):
            assert table_name in tables, (
                f"{json_file.name} maps to table '{table_name}' which does not "
                f"exist in the profile DB. Available tables: {sorted(tables)}"
            )


@pytest.mark.instance_integrity
class TestMockdataColumnsMatchSchema:
    """Record fields must correspond to DB columns."""

    @pytest.mark.parametrize(
        "instance_dir", _INSTANCES_WITH_MOCKDATA, ids=_instance_id
    )
    def test_columns_match(self, instance_dir):
        _config, db_path = get_first_compatible_db(instance_dir)
        if not db_is_valid_sqlite(db_path):
            pytest.skip(f"DB at {db_path} is not a valid SQLite file")

        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        tables = get_db_tables(conn)
        errors = []

        for json_file, table_name, records in _mockdata_files(instance_dir):
            if table_name not in tables:
                continue
            db_columns = get_table_columns(conn, table_name)
            for record in records:
                for key in record:
                    if key in db_columns:
                        continue
                    if camel_to_snake(key) in db_columns:
                        continue
                    if isinstance(record[key], (dict, list)):
                        continue
                    errors.append(
                        f"{json_file.name}: field '{key}' has no column "
                        f"in table '{table_name}' (columns: {sorted(db_columns)})"
                    )

        conn.close()
        assert not errors, "Column mismatches found:\n" + "\n".join(errors)


@pytest.mark.instance_integrity
class TestMockdataTemplatesRecognised:
    """All {{template}} placeholders must be in the known registry."""

    @pytest.mark.parametrize(
        "instance_dir", _INSTANCES_WITH_MOCKDATA, ids=_instance_id
    )
    def test_all_templates_known(self, instance_dir):
        scenario_config = get_scenario_config(instance_dir)
        app_name = scenario_config["app_name"]
        errors = []

        for json_file, _table, records in _mockdata_files(instance_dir):
            templates = scan_templates(records)
            for tmpl in sorted(templates):
                if not is_known_template(tmpl, app_name):
                    errors.append(
                        f"{json_file.name}: unknown template '{{{{{tmpl}}}}}' "
                        f"for app '{app_name}'"
                    )

        assert not errors, "Unrecognised templates:\n" + "\n".join(errors)


@pytest.mark.instance_integrity
class TestMockdataTypeConsistency:
    """INTEGER columns should not receive non-numeric string literals."""

    @pytest.mark.parametrize(
        "instance_dir", _INSTANCES_WITH_MOCKDATA, ids=_instance_id
    )
    def test_integer_columns_have_numeric_values(self, instance_dir):
        _config, db_path = get_first_compatible_db(instance_dir)
        if not db_is_valid_sqlite(db_path):
            pytest.skip(f"DB at {db_path} is not a valid SQLite file")

        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        tables = get_db_tables(conn)
        errors = []

        for json_file, table_name, records in _mockdata_files(instance_dir):
            if table_name not in tables:
                continue

            pragma = conn.execute(f"PRAGMA table_info([{table_name}])").fetchall()
            schema = {row[1]: row[2].upper() for row in pragma}

            for record in records:
                for key, value in record.items():
                    if value is None:
                        continue
                    if isinstance(value, str) and _TEMPLATE_RE.search(value):
                        continue

                    col_name = key if key in schema else camel_to_snake(key)
                    if col_name not in schema:
                        continue

                    col_type = schema[col_name]
                    if col_type in ("INTEGER", "INT", "BIGINT"):
                        if isinstance(value, (int, bool)):
                            continue
                        if isinstance(value, float) and value == int(value):
                            continue
                        errors.append(
                            f"{json_file.name}: field '{key}' has value "
                            f"{value!r} ({type(value).__name__}) but column "
                            f"'{col_name}' expects {col_type}"
                        )

        conn.close()
        assert not errors, "Type mismatches:\n" + "\n".join(errors)
