# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for ecommerce scenario instance generation."""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

from pydantic import BaseModel

from digiworld.scenarios.constraints import EntityExistsConstraint

CART_HAS_ITEMS = EntityExistsConstraint(table="cart_items", user_filter=True, min_count=1)
HAS_ORDERS = EntityExistsConstraint(table="orders", user_filter=True, min_count=1)
HAS_ADDRESSES = EntityExistsConstraint(table="addresses", user_filter=True, min_count=1)
HAS_PAYMENT_METHODS = EntityExistsConstraint(table="payment_methods", user_filter=True, min_count=1)
HAS_MULTIPLE_ADDRESSES = EntityExistsConstraint(table="addresses", user_filter=True, min_count=2)

_STATE_DATA_DIR = (
    Path(__file__).resolve().parents[3]
    / "state_data" / "com.andojoshop.sbx"
)

# ---------------------------------------------------------------------------
# Unicode sanitisation
# LLMs emit fancy Unicode (non-breaking hyphens, narrow spaces, curly quotes,
# etc.) that breaks substring_match comparisons.  Sanitize at load time so
# every downstream consumer — instance generation, scenario verification —
# always works with plain ASCII.
# ---------------------------------------------------------------------------
_UNICODE_REPLACEMENTS = {
    "\u2011": "-",   # non-breaking hyphen
    "\u2012": "-",   # figure dash
    "\u2013": "-",   # en dash
    "\u2014": "-",   # em dash
    "\u202f": " ",   # narrow no-break space
    "\u00a0": " ",   # non-breaking space
    "\u00d7": "x",   # multiplication sign ×
    "\u2019": "'",   # right single quotation mark
    "\u2018": "'",   # left single quotation mark
    "\u201c": '"',   # left double quotation mark
    "\u201d": '"',   # right double quotation mark
    "\u2026": "...", # horizontal ellipsis
}


def _sanitize_unicode(value: Any) -> Any:
    """Recursively replace fancy Unicode with plain ASCII in strings/dicts/lists.

    Also handles values that are JSON-encoded strings (e.g. the ``specs``
    field stored as a serialised dict) by parsing, sanitising, and
    re-serialising them.
    """
    if isinstance(value, str):
        # Check if this string is itself a JSON-encoded object/array
        stripped = value.strip()
        if stripped and stripped[0] in ("{", "["):
            try:
                inner = json.loads(value)
                cleaned = _sanitize_unicode(inner)
                return json.dumps(cleaned, ensure_ascii=False)
            except (json.JSONDecodeError, ValueError):
                pass
        for bad, good in _UNICODE_REPLACEMENTS.items():
            value = value.replace(bad, good)
        return value
    if isinstance(value, dict):
        return {k: _sanitize_unicode(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_unicode(v) for v in value]
    return value


def _list_ecommerce_profiles() -> List[str]:
    """List base profiles (no theme variants) that have a product catalog."""
    profiles = []
    for item in sorted(_STATE_DATA_DIR.iterdir()):
        if not item.is_dir() or "-theme_" in item.name:
            continue
        if (item / "mockdata" / "mock-products.json").exists():
            profiles.append(item.name)
    if not profiles:
        raise FileNotFoundError(
            f"No ecommerce profiles with product catalogs found in {_STATE_DATA_DIR}"
        )
    return profiles


def load_product_catalog(profile_name: str = "default") -> List[Dict[str, Any]]:
    """Load the ecommerce product catalog for a specific profile."""
    path = _STATE_DATA_DIR / profile_name / "mockdata" / "mock-products.json"
    with open(path) as f:
        return _sanitize_unicode(json.load(f))


def get_products_by_category(category_name: str, profile_name: str = "default") -> List[Dict[str, Any]]:
    """Filter catalog products by category name."""
    return [p for p in load_product_catalog(profile_name) if p["categoryName"] == category_name]


def pick_products(
    rng: Any,
    count: int,
    category_name: Optional[str] = None,
    require_spec_key: Optional[str] = None,
    min_review_count: Optional[int] = None,
    min_discount_percent: Optional[int] = None,
    profile_name: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Pick *count* distinct products from a profile's catalog, optionally filtered.

    Products with duplicate names are excluded to avoid ambiguous DB lookups.
    When *profile_name* is ``None``, a random profile is chosen so that
    each product is tagged with its ``_source_profile`` for downstream
    ``compatible_profiles`` assignment.
    """
    if profile_name is None:
        profiles = _list_ecommerce_profiles()
        profile_name = rng.choice(profiles)

    catalog = load_product_catalog(profile_name)
    # Deduplicate by name -- keep only the first occurrence of each name
    seen_names: set = set()
    deduped: List[Dict[str, Any]] = []
    for p in catalog:
        if p["name"] not in seen_names:
            seen_names.add(p["name"])
            deduped.append(p)
    catalog = deduped

    if category_name:
        catalog = [p for p in catalog if p["categoryName"] == category_name]
    if require_spec_key:
        catalog = [
            p for p in catalog
            if p.get("specs") and require_spec_key in p["specs"]
        ]
    if min_review_count is not None:
        catalog = [p for p in catalog if (p.get("reviewCount") or 0) >= min_review_count]
    if min_discount_percent is not None:
        catalog = [p for p in catalog if (p.get("discountPercent") or 0) >= min_discount_percent]
    if len(catalog) < count:
        raise ValueError(
            f"Not enough products matching filters "
            f"(profile={profile_name}, category={category_name}, "
            f"spec_key={require_spec_key}, "
            f"min_review_count={min_review_count}, "
            f"min_discount_percent={min_discount_percent}): "
            f"need {count}, found {len(catalog)}"
        )
    selected = list(rng.sample(catalog, count))
    for p in selected:
        p["_source_profile"] = profile_name
    return selected


def query_product_by_name(scenario: Any, state_path: str, product_name: str) -> Dict[str, Any]:
    """Query a product row by exact name.  Returns a dict or raises ValueError.

    Raises if multiple products share the same name (ambiguous).
    """
    rows = scenario._execute_query_in_path(
        "SELECT id, name, description, price, discounted_price, discount_percent, "
        "rating, review_count, seller, stock_count, in_stock, specs "
        "FROM products WHERE name = ? ORDER BY id DESC",
        (product_name,),
        state_path,
    )
    if not rows:
        raise ValueError(f"Product '{product_name}' not found in database")
    # When duplicates exist, use the highest-ID record (most recently injected)
    row = rows[0]
    specs_raw = row[11]
    return {
        "id": row[0],
        "name": row[1],
        "description": row[2],
        "price": row[3],
        "discounted_price": row[4],
        "discount_percent": row[5],
        "rating": row[6],
        "review_count": row[7],
        "seller": row[8],
        "stock_count": row[9],
        "in_stock": row[10],
        "specs": json.loads(specs_raw) if specs_raw else {},
    }


def get_product_spec_value(
    scenario: Any, state_path: str, product_name: str, spec_key: str
) -> str:
    """Extract a single spec field from a product.  Raises ValueError if missing.

    Performs case-insensitive key lookup so ``"RAM"`` matches ``"ram"``.
    """
    product = query_product_by_name(scenario, state_path, product_name)
    specs = product["specs"]
    value = specs.get(spec_key)
    if value is None:
        key_lower = spec_key.lower()
        for k, v in specs.items():
            if k.lower() == key_lower:
                value = v
                break
    if value is None:
        raise ValueError(
            f"Product '{product_name}' has no '{spec_key}' in specs. "
            f"Available keys: {sorted(specs.keys())}"
        )
    return str(value)


# ---------------------------------------------------------------
# Record builders for mockdata injection
# ---------------------------------------------------------------

_SQLITE_TS = "2025-06-15 12:00:00.000"


def product_record_from_catalog(catalog_product: Dict[str, Any]) -> Dict[str, Any]:
    """Convert a product dict from the JSON catalog into a mockdata record
    suitable for injection via ``write_mockdata``.

    This lets scenarios that previously relied on the profile's pre-existing
    DB rows inject their own copy, so they work regardless of emulator
    app startup behaviour.
    """
    specs = catalog_product.get("specs", {})
    if isinstance(specs, str):
        specs_str = specs
    else:
        specs_str = json.dumps(specs)

    return {
        "id": "{{auto_id}}",
        "name": catalog_product["name"],
        "description": catalog_product.get("description", f"Product: {catalog_product['name']}"),
        "shortDescription": catalog_product.get("shortDescription", catalog_product["name"]),
        "rating": catalog_product.get("rating", 4.0),
        "reviewCount": catalog_product.get("reviewCount", 0),
        "seller": catalog_product.get("seller", "Test Seller"),
        "price": catalog_product.get("price", 29.99),
        "discountedPrice": catalog_product.get("discountedPrice", catalog_product.get("price", 29.99)),
        "discountPercent": catalog_product.get("discountPercent", 0),
        "categoryId": catalog_product.get("categoryId", 1),
        "categoryName": catalog_product.get("categoryName", "General"),
        "subcategoryId": catalog_product.get("subcategoryId", 1),
        "subcategoryName": catalog_product.get("subcategoryName", "General"),
        "inStock": catalog_product.get("inStock", True),
        "stockCount": catalog_product.get("stockCount", 50),
        "imageUrl": catalog_product.get("imageUrl", "/test_1"),
        "specs": specs_str,
        "tags": json.dumps(catalog_product.get("tags", [])) if isinstance(catalog_product.get("tags"), list) else catalog_product.get("tags", "[]"),
        "isFeatured": catalog_product.get("isFeatured", False),
        "dateAdded": _SQLITE_TS,
    }


def product_record(
    name: str,
    specs: Dict[str, Any],
    category_name: str = "Beauty & Personal Care",
    subcategory_name: str = "General",
    price: float = 29.99,
    discounted_price: Optional[float] = None,
    seller: str = "Test Seller",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a products record for mockdata injection."""
    record: Dict[str, Any] = {
        "id": "{{auto_id}}",
        "name": name,
        "description": f"Product: {name}",
        "shortDescription": name,
        "rating": 4.0,
        "reviewCount": 0,
        "seller": seller,
        "price": price,
        "discountedPrice": discounted_price if discounted_price is not None else price,
        "discountPercent": 0,
        "categoryId": 1,
        "categoryName": category_name,
        "subcategoryId": 1,
        "subcategoryName": subcategory_name,
        "inStock": True,
        "stockCount": 50,
        "imageUrl": "/test_1",
        "specs": json.dumps(specs),
        "tags": json.dumps([category_name.lower()]),
        "isFeatured": False,
        "dateAdded": _SQLITE_TS,
    }
    record.update(overrides)
    return record


def cart_item_record(
    product_name: str,
    price: float,
    discounted_price: Optional[float] = None,
    quantity: int = 1,
    seller: str = "Test Seller",
    product_image: str = "https://picsum.photos/seed/mock/600/400",
    short_description: str = "Mock product",
    product_id: int = 1,
    category_name: str = "",
    subcategory_name: str = "",
    in_stock: int = 1,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a cart_items record for mockdata injection.

    Columns match the actual migration schema in ``migrations/index.ts``
    (all TEXT NOT NULL DEFAULT columns are included explicitly so the
    ``_insert_flat_record`` adapter path never sends NULL for them).
    """
    dp = discounted_price if discounted_price is not None else price
    record: Dict[str, Any] = {
        "id": "{{auto_id}}",
        "cart_id": "{{current_user_cart_id}}",
        "user_id": "{{current_user_id}}",
        "product_id": product_id,
        "product_name": product_name,
        "product_image": product_image,
        "short_description": short_description,
        "seller": seller,
        "quantity": quantity,
        "price": price,
        "discounted_price": dp,
        "total": round(quantity * dp, 2),
        "saved_amount": round(price * quantity - dp * quantity, 2),
        "in_stock": in_stock,
        "category_name": category_name,
        "subcategory_name": subcategory_name,
        "sku": "",
        "added_at": _SQLITE_TS,
        "created_at": _SQLITE_TS,
        "updated_at": _SQLITE_TS,
    }
    record.update(overrides)
    return record


def payment_method_record(
    name_on_card: str,
    card_number: str,
    expiry_month: str,
    expiry_year: str,
    card_type: str = "Visa",
    is_default: int = 0,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a payment_methods record for mockdata injection.

    The migration schema declares ``created_at`` / ``updated_at`` as
    ``TEXT NOT NULL DEFAULT (strftime(...))``.  We include them explicitly
    as formatted date-time strings so the adapter never sends NULL.
    """
    record: Dict[str, Any] = {
        "id": "{{auto_id}}",
        "user_id": "{{current_user_id}}",
        "type": "card",
        "card_type": card_type,
        "name_on_card": name_on_card,
        "card_number": card_number,
        "expiry_month": expiry_month,
        "expiry_year": expiry_year,
        "is_default": is_default,
        "created_at": _SQLITE_TS,
        "updated_at": _SQLITE_TS,
    }
    record.update(overrides)
    return record


def address_record(
    full_name: str,
    street: str,
    city: str,
    state: str,
    pincode: str,
    phone: str = "555-0100",
    country: str = "United States",
    delivery_instructions: str = "",
    is_default: int = 0,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build an addresses record for mockdata injection."""
    record: Dict[str, Any] = {
        "id": "{{auto_id}}",
        "user_id": "{{current_user_id}}",
        "full_name": full_name,
        "street": street,
        "city": city,
        "state": state,
        "pincode": pincode,
        "phone": phone,
        "country": country,
        "delivery_instructions": delivery_instructions,
        "is_default": is_default,
        "created_at": _SQLITE_TS,
        "updated_at": _SQLITE_TS,
    }
    record.update(overrides)
    return record


def review_record(
    product_id: int,
    user_name: str,
    rating: int,
    title: str,
    comment: str,
    review_date: str = "2025-01-15T10:00:00.000Z",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a reviews record for mockdata injection."""
    record: Dict[str, Any] = {
        "id": "{{auto_id}}",
        "product_id": product_id,
        "user_id": "{{current_user_id}}",
        "user_name": user_name,
        "rating": rating,
        "title": title,
        "comment": comment,
        "has_image": 0,
        "likes_count": 0,
        "liked_by": "[]",
        "reply_count": 0,
        "is_verified_purchase": 0,
        "status": "published",
        "review_date": review_date,
    }
    record.update(overrides)
    return record


# ---------------------------------------------------------------
# Pydantic models and LLM prompts
# ---------------------------------------------------------------

class SearchQueryBatch(BaseModel):
    queries: List[str]


def search_query_prompt(category: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic product search queries "
        f"for an e-commerce app. Category: {category}. "
        f"Queries should be 1-4 words and natural. "
        f"Ensure variety. Return JSON with key 'queries' as a list of strings."
    )


class AddressBatch(BaseModel):
    first_names: List[str]
    last_names: List[str]
    addresses: List[str]
    cities: List[str]
    states: List[str]
    postal_codes: List[str]
    phone_numbers: List[str]


def address_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} realistic US shipping addresses for an "
        f"e-commerce app. For each, provide first name, last name, street "
        f"address, city, state abbreviation, 5-digit zip code, and phone "
        f"number (format: +1-555-XXXX). "
        f"Ensure variety. Return JSON with keys 'first_names', 'last_names', "
        f"'addresses', 'cities', 'states', 'postal_codes', 'phone_numbers' "
        f"as parallel arrays."
    )
