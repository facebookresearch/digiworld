# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared test helpers -- mock heavy dependencies before scenario imports."""

import sys
from unittest.mock import MagicMock

_MOCK_MODULES = [
    "packaging",
    "packaging.version",
    "adb_actions",
    "emulator_backends",
    "database_validator",
    "pydantic",
    "digiworld.app_registry",
    "digiworld.profile_variants",
    "digiworld.scenarios.config_loader",
    "digiworld.scenarios.state_manager",
    "digiworld.scenarios.context_extractor",
    "digiworld.scenarios.mockdata_handler",
    "digiworld.scenarios.template_resolver",
    "digiworld.scenarios.scenarios.eats.template_resolver",
]

for mod in _MOCK_MODULES:
    if mod not in sys.modules:
        sys.modules[mod] = MagicMock()

EATS_SCHEMA_SQL = """
CREATE TABLE users (
    id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL,
    first_name TEXT NOT NULL, last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL, settings TEXT NOT NULL, status TEXT NOT NULL
);
CREATE TABLE user_addresses (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, label TEXT NOT NULL,
    address_line_1 TEXT NOT NULL, address_line_2 TEXT, city TEXT NOT NULL,
    state TEXT NOT NULL, postal_code TEXT NOT NULL, country TEXT NOT NULL,
    latitude REAL, longitude REAL, is_default INTEGER NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE restaurants (
    id INTEGER PRIMARY KEY, name TEXT NOT NULL, description TEXT,
    address TEXT NOT NULL, latitude REAL, longitude REAL, logo TEXT,
    rating REAL, delivery_fee REAL, min_order REAL, delivery_radius INTEGER,
    created_at TEXT NOT NULL
);
CREATE TABLE categories (
    id INTEGER PRIMARY KEY, restaurant_id INTEGER NOT NULL,
    name TEXT NOT NULL, position INTEGER
);
CREATE TABLE menu_items (
    id INTEGER PRIMARY KEY, restaurant_id INTEGER NOT NULL,
    category_id INTEGER NOT NULL, name TEXT NOT NULL, description TEXT,
    price REAL NOT NULL, image TEXT, calories INTEGER, is_popular INTEGER,
    is_active INTEGER, position INTEGER
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL, address_id INTEGER NOT NULL,
    status TEXT NOT NULL, total REAL NOT NULL, delivery_address TEXT NOT NULL,
    payment_method TEXT NOT NULL, special_instructions TEXT,
    cutlery INTEGER, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE order_items (
    id INTEGER PRIMARY KEY, order_id INTEGER NOT NULL,
    menu_item_id INTEGER NOT NULL, quantity INTEGER NOT NULL,
    price REAL NOT NULL, special_instructions TEXT
);
"""
