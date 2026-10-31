# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Parameter-aware feasibility constraints used to recompute compatible_profiles."""

import importlib
import sqlite3

import pytest


def _feas(path):
    return importlib.import_module(f"digiworld.scenarios.scenarios.{path}.feasibility")


def _ok(path, conn, params):
    return all(c.evaluate(conn, params) for c in _feas(path).CONSTRAINTS)


@pytest.fixture
def conn():
    c = sqlite3.connect(":memory:")
    yield c
    c.close()


def test_credit_card_capacity_follows_tier(conn):
    conn.executescript(
        "CREATE TABLE account_tier_levels (id INTEGER PRIMARY KEY, code TEXT);"
        "CREATE TABLE users (id INTEGER PRIMARY KEY, account_tier_id INTEGER);"
        "CREATE TABLE credit_cards (id INTEGER PRIMARY KEY, user_id INTEGER, status TEXT);"
        "INSERT INTO account_tier_levels VALUES (1, 'everyday'), (2, 'sapphire');"
        "INSERT INTO users VALUES (1, 2);"
        "INSERT INTO credit_cards VALUES (1, 1, 'active');"
    )
    assert _ok("banking.apply_credit_card", conn, {})  # sapphire: 1 of 3
    conn.execute("UPDATE users SET account_tier_id = 1")
    assert not _ok("banking.apply_credit_card", conn, {})  # everyday: 1 of 1


def test_wallpaper_must_differ(conn):
    conn.executescript(
        "CREATE TABLE chat_settings (user_id TEXT PRIMARY KEY, font_size TEXT, wallpaper TEXT);"
        "INSERT INTO chat_settings VALUES ('1', 'medium', '/wallpapers/space.jpg');"
    )
    assert not _ok("message.set_chat_wallpaper", conn, {"wallpaper": "space"})
    assert _ok("message.set_chat_wallpaper", conn, {"wallpaper": "gradient"})
    assert _ok("message.set_chat_wallpaper", conn, {"wallpaper": "default"})


def test_toggle_all_needs_something_to_toggle(conn):
    conn.executescript(
        "CREATE TABLE devices (id INTEGER, user_id INTEGER, is_on INTEGER, deleted_at TEXT);"
        "CREATE TABLE scenes (id INTEGER, user_id INTEGER, is_active INTEGER, deleted_at TEXT);"
        "CREATE TABLE automations (id INTEGER, user_id INTEGER, is_active INTEGER, deleted_at TEXT);"
        "INSERT INTO devices VALUES (1, 1, 1, NULL);"
        "INSERT INTO scenes VALUES (1, 1, 0, NULL);"
        "INSERT INTO automations VALUES (1, 1, 1, NULL);"
    )
    path = "smarthome.toggle_all_category"
    assert not _ok(path, conn, {"action": "Enable", "item_type": "automations"})
    assert _ok(path, conn, {"action": "Enable", "item_type": "scenes"})
    assert _ok(path, conn, {"action": "Turn off", "item_type": "devices"})


def test_genre_must_exist(conn):
    conn.executescript(
        "CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT);"
        "CREATE TABLE songs (id INTEGER PRIMARY KEY, categories TEXT);"
        "INSERT INTO categories VALUES (1, 'Rock');"
        "INSERT INTO songs VALUES (1, '1');"
    )
    assert _ok("music.play_genre_playlist", conn, {"genre": "rock"})
    assert not _ok("music.play_genre_playlist", conn, {"genre": "Ambient"})


def test_alert_needs_alternatives(conn):
    conn.executescript(
        "CREATE TABLE service_alerts (id TEXT, title TEXT, recommended_alternatives TEXT);"
        "INSERT INTO service_alerts VALUES ('a', 'Signal Delay', '[]'), ('b', 'Aurora Line Delays', 'Use the bus.');"
    )
    assert not _ok("transit.alert_alternatives", conn, {"alert_title": "Signal Delay"})
    assert _ok(
        "transit.alert_alternatives", conn, {"alert_title": "Aurora Line Delays"}
    )


def test_address_cap(conn):
    conn.executescript(
        "CREATE TABLE addresses (id INTEGER, user_id INTEGER);"
        "INSERT INTO addresses VALUES (1, 1), (2, 1);"
    )
    assert _ok("ecommerce.add_saved_address", conn, {})
    conn.execute("INSERT INTO addresses VALUES (3, 1)")
    assert not _ok("ecommerce.add_saved_address", conn, {})
