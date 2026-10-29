# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Unit tests for DatabaseValidator.execute_data_append (mockdata merge)."""

import json
import sqlite3

import pytest

from digiworld.adb.validator import DatabaseValidator

SCHEMA = """
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
CREATE TABLE addresses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    street TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
CREATE TABLE subcategories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    parent_category_id INTEGER NOT NULL REFERENCES categories(id)
);
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    category_name TEXT NOT NULL,
    subcategory_id INTEGER NOT NULL REFERENCES subcategories(id),
    subcategory_name TEXT NOT NULL,
    tags TEXT
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL
);
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_name TEXT NOT NULL
);
CREATE TABLE bookings (booking_id TEXT PRIMARY KEY, status TEXT NOT NULL);
CREATE TABLE booking_flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id TEXT NOT NULL REFERENCES bookings(booking_id),
    flight_id TEXT NOT NULL
);
CREATE TABLE passengers (
    passenger_id TEXT PRIMARY KEY,
    booking_id TEXT NOT NULL REFERENCES bookings(booking_id),
    first_name TEXT NOT NULL
);
CREATE TABLE seat_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passenger_id TEXT NOT NULL REFERENCES passengers(passenger_id),
    flight_id TEXT NOT NULL,
    seat_number TEXT NOT NULL
);
INSERT INTO users (id, name) VALUES (1, 'Ada');
INSERT INTO categories (id, name) VALUES (1, 'Toys & Games'), (2, 'Electronics');
INSERT INTO subcategories (id, name, parent_category_id)
    VALUES (10, 'Accessories', 2), (11, 'Accessories', 1), (12, 'Puzzles', 1);
"""


@pytest.fixture
def merge(tmp_path):
    """Run execute_data_append on a fresh DB; return a connection to modify.db."""
    current = tmp_path / "current.db"
    conn = sqlite3.connect(current)
    conn.executescript(SCHEMA)
    conn.close()
    source = tmp_path / "source"
    source.mkdir()

    def _run(files, mockdata_files=()):
        for name, records in files.items():
            (source / name).write_text(json.dumps(records))
        validator = DatabaseValidator(
            "com.example.app", {"mockdata_files": list(mockdata_files)}
        )
        modified = tmp_path / "modify.db"
        assert validator.execute_data_append(str(current), str(modified), str(source))
        out = sqlite3.connect(modified)
        out.row_factory = sqlite3.Row
        return out

    return _run


def rows(conn, sql, *args):
    return [dict(r) for r in conn.execute(sql, args).fetchall()]


def test_merges_instance_files_outside_mockdata_files(merge):
    db = merge(
        {
            "mock-addresses.json": [{"id": 7, "userId": 1, "street": "1 Main St"}],
            "mock-unknown_table.json": [{"id": 1}],
        },
        mockdata_files=["mock-products.json"],
    )
    assert rows(db, "SELECT id, user_id, street FROM addresses") == [
        {"id": 7, "user_id": 1, "street": "1 Main St"}
    ]


def test_merges_without_any_configured_mockdata_files(merge):
    db = merge({"mock-addresses.json": [{"userId": 1, "street": "2 Side St"}]})
    assert rows(db, "SELECT street FROM addresses") == [{"street": "2 Side St"}]


def test_maps_camel_case_and_encodes_json_columns(merge):
    db = merge(
        {
            "mock-products.json": [
                {
                    "id": 5,
                    "name": "Cube",
                    "categoryId": 1,
                    "categoryName": "Toys & Games",
                    "subcategoryId": 12,
                    "subcategoryName": "Puzzles",
                    "tags": ["a", "b"],
                }
            ]
        },
        mockdata_files=["mock-products.json"],
    )
    product = rows(db, "SELECT * FROM products")[0]
    assert product["category_id"] == 1 and product["subcategory_id"] == 12
    assert json.loads(product["tags"]) == ["a", "b"]


def test_resolves_not_null_foreign_keys_by_name(merge):
    db = merge(
        {
            "mock-products.json": [
                {
                    "id": 9904,
                    "name": "Block Set",
                    "categoryName": "toys & games",
                    "subcategoryName": "Accessories",
                },
                {
                    "id": 9905,
                    "name": "Cable",
                    "categoryName": "Electronics",
                    "subcategoryName": "Accessories",
                },
            ]
        },
        mockdata_files=["mock-products.json"],
    )
    got = rows(db, "SELECT id, category_id, subcategory_id FROM products ORDER BY id")
    # the subcategory is the 'Accessories' row under the resolved category
    assert got == [
        {"id": 9904, "category_id": 1, "subcategory_id": 11},
        {"id": 9905, "category_id": 2, "subcategory_id": 10},
    ]


def test_unknown_name_leaves_insert_failing_without_aborting(merge):
    db = merge(
        {
            "mock-products.json": [
                {
                    "id": 1,
                    "name": "Ghost",
                    "categoryName": "Garden",
                    "subcategoryName": "Tools",
                },
                {
                    "id": 2,
                    "name": "Kit",
                    "categoryName": "Toys & Games",
                    "subcategoryName": "Puzzles",
                },
            ]
        },
        mockdata_files=["mock-products.json"],
    )
    assert rows(db, "SELECT id FROM products") == [{"id": 2}]


def test_flattens_nested_lists_into_child_tables(merge):
    db = merge(
        {
            "mock-bookings.json": [
                {
                    "booking_id": "BK-1",
                    "status": "confirmed",
                    "flights": [{"flight_id": "AV1_2026-08-15"}],
                    "passengers": [
                        {
                            "passenger_id": "P-1",
                            "first_name": "Test",
                            "seat_assignments": [
                                {"flight_id": "AV1_2026-08-15", "seat_number": "7A"}
                            ],
                        }
                    ],
                }
            ]
        },
        mockdata_files=["mock-bookings.json"],
    )
    assert rows(db, "SELECT booking_id, status FROM bookings") == [
        {"booking_id": "BK-1", "status": "confirmed"}
    ]
    assert rows(db, "SELECT booking_id, flight_id FROM booking_flights") == [
        {"booking_id": "BK-1", "flight_id": "AV1_2026-08-15"}
    ]
    assert rows(db, "SELECT passenger_id, booking_id FROM passengers") == [
        {"passenger_id": "P-1", "booking_id": "BK-1"}
    ]
    assert rows(db, "SELECT passenger_id, seat_number FROM seat_assignments") == [
        {"passenger_id": "P-1", "seat_number": "7A"}
    ]


def test_nested_rows_link_to_sqlite_assigned_parent_ids(merge):
    db = merge(
        {
            "mock-orders.json": [
                {
                    "orderNumber": "ORD-1",
                    "items": [{"productName": "Cube"}, {"productName": "Ball"}],
                    "statusHistory": [
                        {"status": "Placed"}
                    ],  # no matching table: dropped
                }
            ]
        },
        mockdata_files=["mock-orders.json"],
    )
    order_id = rows(db, "SELECT id FROM orders WHERE order_number = 'ORD-1'")[0]["id"]
    assert rows(db, "SELECT order_id, product_name FROM order_items ORDER BY id") == [
        {"order_id": order_id, "product_name": "Cube"},
        {"order_id": order_id, "product_name": "Ball"},
    ]
