# Copyright (c) Meta Platforms, Inc. and affiliates.
import json
import os
import sqlite3

import pytest

from digiworld.scenarios.scenarios.ecommerce.count_reviews_for_item.scenario import CountReviewsForItemScenario
from digiworld.scenarios.scenarios.ecommerce.is_item_on_sale.scenario import IsItemOnSaleScenario
from digiworld.scenarios.scenarios.ecommerce.item_star_rating.scenario import ItemStarRatingScenario
from digiworld.scenarios.scenarios.ecommerce.snack_weight.scenario import SnackWeightScenario
from digiworld.scenarios.scenarios.ecommerce.latest_review_for_item.scenario import LatestReviewForItemScenario
from digiworld.scenarios.scenarios.ecommerce.most_recent_order_number.scenario import MostRecentOrderNumberScenario
from digiworld.scenarios.scenarios.ecommerce.go_to_page.scenario import GoToPageScenario
from digiworld.scenarios.scenarios.ecommerce.toggle_setting.scenario import ToggleSettingScenario
from digiworld.scenarios.scenarios.ecommerce.add_item_to_cart.scenario import AddItemToCartScenario
from digiworld.scenarios.scenarios.ecommerce.remove_item_from_cart.scenario import RemoveItemFromCartScenario
from digiworld.scenarios.scenarios.ecommerce.leave_review.scenario import LeaveReviewScenario


# ---------------------------------------------------------------------------
# Schema & helpers
# ---------------------------------------------------------------------------

SCHEMA = """\
CREATE TABLE users (
    id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, email TEXT UNIQUE,
    password TEXT, phone_number TEXT, profile_picture TEXT, date_joined INTEGER,
    cart_id TEXT, created_at INTEGER, updated_at INTEGER
);
CREATE TABLE categories (
    id INTEGER PRIMARY KEY, name TEXT, icon TEXT,
    created_at INTEGER, updated_at INTEGER
);
CREATE TABLE subcategories (
    id INTEGER PRIMARY KEY, name TEXT,
    parent_category_id INTEGER REFERENCES categories(id),
    created_at INTEGER, updated_at INTEGER
);
CREATE TABLE products (
    id INTEGER PRIMARY KEY, name TEXT, description TEXT, short_description TEXT,
    price REAL, discounted_price REAL, discount_percent INTEGER, rating REAL,
    review_count INTEGER, seller TEXT,
    category_id INTEGER REFERENCES categories(id), category_name TEXT,
    subcategory_id INTEGER REFERENCES subcategories(id), subcategory_name TEXT,
    in_stock INTEGER DEFAULT 1, stock_count INTEGER DEFAULT 0,
    image_url TEXT, specs TEXT, tags TEXT, is_featured INTEGER DEFAULT 0,
    date_added INTEGER, created_at INTEGER, updated_at INTEGER
);
CREATE TABLE reviews (
    id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(id),
    user_id INTEGER REFERENCES users(id), user_name TEXT, user_avatar TEXT,
    parent_review_id INTEGER, rating INTEGER, title TEXT, comment TEXT,
    has_image INTEGER DEFAULT 0, image_url TEXT, likes_count INTEGER DEFAULT 0,
    liked_by TEXT DEFAULT '[]', replies TEXT DEFAULT '[]',
    reply_count INTEGER DEFAULT 0, is_verified_purchase INTEGER DEFAULT 0,
    status TEXT DEFAULT 'published', review_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE carts (
    id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE cart_items (
    id INTEGER PRIMARY KEY, cart_id INTEGER REFERENCES carts(id),
    user_id INTEGER REFERENCES users(id),
    product_id INTEGER REFERENCES products(id),
    product_name TEXT, product_image TEXT, short_description TEXT, seller TEXT,
    quantity INTEGER, price REAL, discounted_price REAL, total REAL,
    in_stock INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE orders (
    id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
    order_number TEXT, status TEXT DEFAULT 'pending',
    total_amount REAL, subtotal REAL, total_savings REAL DEFAULT 0,
    shipping REAL DEFAULT 0, tax REAL DEFAULT 0,
    coupon_discount REAL DEFAULT 0, coupon_code TEXT,
    shipping_address_id INTEGER, shipping_address_snapshot TEXT,
    payment_method TEXT, payment_status TEXT DEFAULT 'pending',
    order_date TEXT DEFAULT CURRENT_TIMESTAMP, shipped_date TEXT,
    delivery_date TEXT, estimated_delivery_date TEXT,
    tracking_number TEXT, courier_partner TEXT, invoice_url TEXT,
    is_gift INTEGER DEFAULT 0, gift_message TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE addresses (
    id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
    full_name TEXT, street TEXT, city TEXT, state TEXT, pincode TEXT,
    phone TEXT, country TEXT, delivery_instructions TEXT,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE payment_methods (
    id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id),
    type TEXT, card_type TEXT, name_on_card TEXT, card_number TEXT,
    expiry_month TEXT, expiry_year TEXT, billing_address_id INTEGER,
    is_default INTEGER DEFAULT 0, created_at INTEGER, updated_at INTEGER
);
"""


def create_test_db(dir_path, data_inserts):
    """Create an in-memory-style SQLite DB on disk with *SCHEMA* and seed rows."""
    db_path = os.path.join(dir_path, "default.db")
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    for sql, params in data_inserts:
        conn.execute(sql, params)
    conn.commit()
    conn.close()
    return db_path


def write_rootstore(dir_path, data):
    """Write a rootstore.json file used by navigation / settings scenarios."""
    path = os.path.join(dir_path, "rootstore.json")
    with open(path, "w") as f:
        json.dump(data, f)
    return path


def _insert_product(
    name,
    *,
    product_id=1,
    review_count=0,
    discount_percent=0,
    rating=0.0,
    price=10.0,
    discounted_price=None,
    seller="TestSeller",
    specs=None,
    stock_count=10,
    in_stock=1,
):
    """Return an ``(sql, params)`` tuple for inserting a product row."""
    if discounted_price is None:
        discounted_price = price
    specs_json = json.dumps(specs) if specs else None
    return (
        "INSERT INTO products "
        "(id, name, description, short_description, price, discounted_price, "
        "discount_percent, rating, review_count, seller, stock_count, in_stock, specs) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            product_id, name, f"{name} description", f"{name} short",
            price, discounted_price, discount_percent, rating,
            review_count, seller, stock_count, in_stock, specs_json,
        ),
    )


# ---------------------------------------------------------------------------
# Mock infrastructure – avoids needing config files / ADB / emulators
# ---------------------------------------------------------------------------

class MockScenarioMixin:
    """Provides the DB-query methods that scenarios inherit from Scenario base."""

    def _execute_query_in_path(self, query, params, state_path):
        db_path = os.path.join(state_path, "default.db")
        conn = sqlite3.connect(db_path)
        rows = conn.execute(query, params).fetchall()
        conn.close()
        return rows

    def compare_database_records(self, state1_path, state2_path, query, params):
        rows1 = self._execute_query_in_path(query, params, state1_path)
        rows2 = self._execute_query_in_path(query, params, state2_path)
        new_records = [r for r in rows2 if r not in rows1]
        return rows1, rows2, new_records

    def get_current_session(self, rootstore):
        session_store = rootstore.get("sessionStore", {})
        sessions = session_store.get("sessions", [])
        if sessions and isinstance(sessions, list):
            return sessions[-1]
        session = session_store.get("session", {})
        if session:
            return session
        return None


# Testable subclasses – MRO puts MockScenarioMixin first so its methods win.

class _CountReviews(MockScenarioMixin, CountReviewsForItemScenario):
    def __init__(self): pass  # noqa: E704


class _IsItemOnSale(MockScenarioMixin, IsItemOnSaleScenario):
    def __init__(self): pass  # noqa: E704


class _ItemStarRating(MockScenarioMixin, ItemStarRatingScenario):
    def __init__(self): pass  # noqa: E704


class _SnackWeight(MockScenarioMixin, SnackWeightScenario):
    def __init__(self): pass  # noqa: E704


class _LatestReview(MockScenarioMixin, LatestReviewForItemScenario):
    def __init__(self): pass  # noqa: E704


class _MostRecentOrder(MockScenarioMixin, MostRecentOrderNumberScenario):
    def __init__(self): pass  # noqa: E704


class _GoToPage(MockScenarioMixin, GoToPageScenario):
    def __init__(self): pass  # noqa: E704


class _ToggleSetting(MockScenarioMixin, ToggleSettingScenario):
    def __init__(self): pass  # noqa: E704


class _AddItemToCart(MockScenarioMixin, AddItemToCartScenario):
    def __init__(self): pass  # noqa: E704


class _RemoveItemFromCart(MockScenarioMixin, RemoveItemFromCartScenario):
    def __init__(self): pass  # noqa: E704


class _LeaveReview(MockScenarioMixin, LeaveReviewScenario):
    def __init__(self): pass  # noqa: E704


# ===================================================================
# Tests
# ===================================================================


def test_count_reviews_for_item_pass(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [_insert_product("TestProduct", review_count=5)])

    s = _CountReviews()
    s.item = "TestProduct"
    s.agent_answer = "There are 5 reviews for this product"

    checks = s._get_checks(state)
    assert checks["answer_correct"] is True


def test_count_reviews_for_item_fail(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [_insert_product("TestProduct", review_count=5)])

    s = _CountReviews()
    s.item = "TestProduct"
    s.agent_answer = "There are 10 reviews"

    checks = s._get_checks(state)
    assert checks["answer_correct"] is False


def test_is_item_on_sale_yes(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        _insert_product("SaleItem", discount_percent=20, price=100.0, discounted_price=80.0),
    ])

    s = _IsItemOnSale()
    s.item = "SaleItem"
    s.agent_answer = "Yes, it is 20% off right now"

    checks = s._get_checks(state)
    assert checks["is_on_sale"] is True
    assert checks["discount_correct"] is True


def test_is_item_on_sale_no(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        _insert_product("RegularItem", discount_percent=0),
    ])

    s = _IsItemOnSale()
    s.item = "RegularItem"
    s.agent_answer = "No, it is not on sale"

    checks = s._get_checks(state)
    assert checks["is_on_sale"] is True
    assert checks["discount_correct"] is True


def test_item_star_rating(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [_insert_product("RatedItem", rating=4.5)])

    s = _ItemStarRating()
    s.item = "RatedItem"
    s.agent_answer = "The product has a 4.5 star rating"

    checks = s._get_checks(state)
    assert checks["answer_correct"] is True


def test_product_spec_snack_weight(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        _insert_product("ChipsSnack", specs={"weight": "236g", "flavor": "BBQ"}),
    ])

    s = _SnackWeight()
    s.item = "ChipsSnack"
    s.agent_answer = "The weight of this snack is 236g"

    checks = s._get_checks(state)
    assert checks["answer_correct"] is True


def test_product_spec_missing_key(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        _insert_product("NoWeightSnack", specs={"flavor": "Cheese"}),
    ])

    s = _SnackWeight()
    s.item = "NoWeightSnack"
    s.agent_answer = "some answer"

    with pytest.raises(ValueError, match="no 'weight' in specs"):
        s._get_checks(state)


def test_product_not_found(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [])

    s = _SnackWeight()
    s.item = "NonexistentProduct"
    s.agent_answer = "anything"

    with pytest.raises(ValueError, match="not found"):
        s._get_checks(state)


def test_latest_review_for_item(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        _insert_product("ReviewedItem", review_count=2),
        (
            "INSERT INTO reviews (id, product_id, user_id, user_name, rating, "
            "title, comment, review_date, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (1, 1, 10, "Alice", 3, "Old review", "Old comment here", "2025-01-01T00:00:00", "2025-01-01T00:00:00"),
        ),
        (
            "INSERT INTO reviews (id, product_id, user_id, user_name, rating, "
            "title, comment, review_date, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
            (2, 1, 11, "Bob", 5, "Latest", "Absolutely loved this product", "2025-02-15T00:00:00", "2025-02-15T00:00:00"),
        ),
    ])

    s = _LatestReview()
    s.item = "ReviewedItem"
    s.agent_answer = "The latest review says: Absolutely loved this product"

    checks = s._get_checks(state)
    assert checks["answer_contains_review"] is True


def test_most_recent_order_number(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        (
            "INSERT INTO orders (id, user_id, order_number, created_at) VALUES (?,?,?,?)",
            (1, 42, "ORD-001", "2025-01-01T00:00:00"),
        ),
        (
            "INSERT INTO orders (id, user_id, order_number, created_at) VALUES (?,?,?,?)",
            (2, 42, "ORD-002", "2025-02-15T12:00:00"),
        ),
    ])

    s = _MostRecentOrder()
    s.current_user_id = 42
    s.agent_answer = "Your most recent order is ORD-002"

    checks = s._get_checks(state)
    assert checks["answer_contains_order_number"] is True


def test_go_to_page_home(tmp_path):
    state = str(tmp_path)
    write_rootstore(state, {
        "sessionStore": {
            "session": {
                "data": {"screenName": "Home", "route": "/home"},
            },
        },
    })

    s = _GoToPage()
    s.page = "Home"
    assert s._check_task_completion(state) is True


def test_go_to_page_wrong(tmp_path):
    state = str(tmp_path)
    write_rootstore(state, {
        "sessionStore": {
            "session": {
                "data": {"screenName": "Cart", "route": "/cart"},
            },
        },
    })

    s = _GoToPage()
    s.page = "Home"
    assert s._check_task_completion(state) is False


def test_add_item_to_cart(tmp_path):
    initial_dir = tmp_path / "initial"
    initial_dir.mkdir()
    final_dir = tmp_path / "final"
    final_dir.mkdir()

    create_test_db(str(initial_dir), [
        ("INSERT INTO carts (id, user_id) VALUES (?,?)", (1, 42)),
    ])
    create_test_db(str(final_dir), [
        ("INSERT INTO carts (id, user_id) VALUES (?,?)", (1, 42)),
        (
            "INSERT INTO cart_items (id, cart_id, user_id, product_id, "
            "product_name, quantity, price) VALUES (?,?,?,?,?,?,?)",
            (1, 1, 42, 100, "Awesome Gadget", 1, 29.99),
        ),
    ])

    s = _AddItemToCart()
    s.item = "Awesome Gadget"
    s.current_user_id = 42
    s.initial_state_path = str(initial_dir)

    checks = s._get_checks(str(final_dir))
    assert checks["item_added"] is True


def test_remove_item_from_cart(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        ("INSERT INTO carts (id, user_id) VALUES (?,?)", (1, 42)),
        (
            "INSERT INTO cart_items (id, cart_id, user_id, product_id, "
            "product_name, quantity, price) VALUES (?,?,?,?,?,?,?)",
            (1, 1, 42, 200, "Other Product", 1, 19.99),
        ),
    ])

    s = _RemoveItemFromCart()
    s.item = "Removed Gadget"
    s.current_user_id = 42

    checks = s._get_checks(state)
    assert checks["item_removed"] is True


def test_toggle_setting_enable_dark_mode(tmp_path):
    state = str(tmp_path)
    write_rootstore(state, {
        "sessionStore": {
            "session": {
                "data": {
                    "sessionData": {
                        "formData": {"isDarkMode": True},
                    },
                },
            },
        },
    })

    s = _ToggleSetting()
    s.setting = "Dark Mode"
    s.action = "Enable"

    checks = s._get_checks(state)
    assert checks["setting_toggled"] is True


def test_leave_review(tmp_path):
    state = str(tmp_path)
    create_test_db(state, [
        _insert_product("ReviewableItem"),
        (
            "INSERT INTO reviews (id, product_id, user_id, user_name, rating, "
            "title, comment, created_at) VALUES (?,?,?,?,?,?,?,?)",
            (1, 1, 42, "TestUser", 4, "Great Product", "Really enjoyed it", "2025-02-01T00:00:00"),
        ),
    ])

    s = _LeaveReview()
    s.item = "ReviewableItem"
    s.current_user_id = 42
    s.star_rating = "4"
    s.review_title = "Great Product"

    checks = s._get_checks(state)
    assert checks["review_created"] is True
    assert checks["rating_matches"] is True
    assert checks["title_matches"] is True
