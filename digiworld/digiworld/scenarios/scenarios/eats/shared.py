# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for eats scenario instance generation."""

import hashlib
import unicodedata
from typing import Any, Dict, List

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import EntityExistsConstraint

ORDERS_EXIST = EntityExistsConstraint(table="orders", user_filter=True, min_count=1)
ADDRESS_EXISTS = EntityExistsConstraint(table="user_addresses", user_filter=True, min_count=1)

INJECTED_RESTAURANT_ID = 90001
INJECTED_CATEGORY_ID = 90001
INJECTED_MENU_ITEM_ID = 90001
INJECTED_MENU_ITEM_ID_2 = 90002
INJECTED_ORDER_ID = 90001
INJECTED_ORDER_ITEM_ID = 90001
INJECTED_ORDER_ITEM_ID_2 = 90002

# ---------------------------------------------------------------------------
# Image pools -- each entry is a distinct Unsplash photo ID.
# ---------------------------------------------------------------------------

_LOGO_PHOTOS = [
    "photo-1555396273-367ea4eb4db5",
    "photo-1517248135467-4c7edcad34c4",
    "photo-1414235077428-338989a2e8c0",
    "photo-1552566626-52f8b828add9",
    "photo-1559339352-11d035aa65de",
    "photo-1466978913421-dad2ebd01d17",
    "photo-1537047902294-62a40c20a6ae",
    "photo-1590846406792-0adc7f938f1d",
    "photo-1521017432531-fbd92d768814",
    "photo-1424847651672-bf20a4b0982b",
]

_ITEM_PHOTOS = [
    "photo-1546069901-ba9599a7e63c",
    "photo-1565299624946-b28f40a0ae38",
    "photo-1569058242567-93de6f36f8e6",
    "photo-1534422298391-e4f8c172dddb",
    "photo-1563379926898-05f4575a45d8",
    "photo-1540189549336-e6e99c3679fe",
    "photo-1585937421612-70a008356fbe",
    "photo-1476224203421-9ac39bcb3327",
    "photo-1504674900247-0877df9cc836",
    "photo-1482049016688-2d3e1b311543",
]

_CUISINE_CATEGORIES = {
    "Italian": ["Pasta", "Pizza", "Antipasti", "Risotto"],
    "Japanese": ["Sushi", "Ramen", "Bento", "Tempura"],
    "Mexican": ["Tacos", "Burritos", "Enchiladas", "Quesadillas"],
    "American": ["Burgers", "BBQ", "Wings", "Sandwiches"],
    "Indian": ["Curry", "Tandoori", "Biryani", "Tikka"],
}

_PAYMENT_METHODS = ["credit_card", "cash", "apple_pay"]


def _pick_photo(pool, key):
    """Deterministically pick a photo from *pool* based on a string *key*."""
    idx = int(hashlib.md5(key.encode()).hexdigest(), 16) % len(pool)
    return pool[idx]


def pick_logo(restaurant_name):
    """Return an Unsplash logo URL unique to *restaurant_name*."""
    photo_id = _pick_photo(_LOGO_PHOTOS, restaurant_name)
    return (
        f"https://images.unsplash.com/{photo_id}"
        "?auto=format&fit=facearea&w=128&h=128&facepad=2&q=80"
    )


def pick_item_image(item_name):
    """Return an Unsplash item image URL unique to *item_name*."""
    photo_id = _pick_photo(_ITEM_PHOTOS, item_name)
    return (
        f"https://images.unsplash.com/{photo_id}"
        "?auto=format&fit=crop&w=600&q=80"
    )


def cuisine_category(cuisine, rng):
    """Return a cuisine-appropriate category name."""
    options = _CUISINE_CATEGORIES.get(cuisine, ["Specials", "Entrees", "Mains"])
    return rng.choice(options)


def sanitize_text(text: str) -> str:
    """Normalize Unicode characters that LLMs sometimes produce.

    Replaces non-breaking hyphens (U+2011), em-dashes (U+2014),
    en-dashes (U+2013), and other dash-like codepoints with plain
    ASCII hyphens so that DB lookups and task descriptions stay
    consistent.  Also normalizes smart quotes and whitespace.
    """
    replacements = {
        "\u2011": "-",  # non-breaking hyphen
        "\u2010": "-",  # hyphen
        "\u2012": "-",  # figure dash
        "\u2013": "-",  # en dash
        "\u2014": "-",  # em dash
        "\u2015": "-",  # horizontal bar
        "\u2018": "'",  # left single quote
        "\u2019": "'",  # right single quote
        "\u201c": '"',  # left double quote
        "\u201d": '"',  # right double quote
        "\u00a0": " ",  # non-breaking space
    }
    for bad, good in replacements.items():
        text = text.replace(bad, good)
    return unicodedata.normalize("NFC", text)


def restaurant_record(name, description="A popular local restaurant.",
                       rating=4.5, delivery_fee=2.99, min_order=10.0,
                       delivery_radius=8,
                       address="123 Test St, Test City, TS 10001",
                       latitude=40.7128, longitude=-74.0060,
                       logo=None, **overrides):
    record = {
        "id": INJECTED_RESTAURANT_ID,
        "name": name,
        "description": description,
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "logo": logo if logo is not None else pick_logo(name),
        "rating": rating,
        "deliveryFee": delivery_fee,
        "minOrder": min_order,
        "deliveryRadius": delivery_radius,
        "createdAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


def category_record(name, restaurant_id=INJECTED_RESTAURANT_ID,
                     position=1, **overrides):
    record = {
        "id": INJECTED_CATEGORY_ID,
        "restaurantId": restaurant_id,
        "name": name,
        "position": position,
    }
    record.update(overrides)
    return record


def menu_item_record(name, price, restaurant_id=INJECTED_RESTAURANT_ID,
                      category_id=INJECTED_CATEGORY_ID, description="",
                      calories=0, is_popular=0, image=None,
                      item_id=INJECTED_MENU_ITEM_ID, **overrides):
    record = {
        "id": item_id,
        "restaurantId": restaurant_id,
        "categoryId": category_id,
        "name": name,
        "description": description,
        "price": price,
        "image": image if image is not None else pick_item_image(name),
        "calories": calories,
        "isPopular": is_popular,
        "isActive": 1,
        "position": 1,
    }
    record.update(overrides)
    return record


def order_record(restaurant_id=INJECTED_RESTAURANT_ID, total=0.0,
                  status="delivered", order_id=INJECTED_ORDER_ID,
                  address_id=1, payment_method="credit_card",
                  delivery_address="123 Test St, Test City, TS 10001",
                  **overrides):
    record = {
        "id": order_id,
        "userId": "{{current_user_id}}",
        "restaurantId": restaurant_id,
        "addressId": address_id,
        "status": status,
        "total": total,
        "deliveryAddress": delivery_address,
        "paymentMethod": payment_method,
        "specialInstructions": "",
        "cutlery": 1,
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


def order_item_record(menu_item_id, quantity, price,
                       order_id=INJECTED_ORDER_ID,
                       item_id=INJECTED_ORDER_ITEM_ID, **overrides):
    record = {
        "id": item_id,
        "orderId": order_id,
        "menuItemId": menu_item_id,
        "quantity": quantity,
        "price": price,
        "specialInstructions": "",
    }
    record.update(overrides)
    return record


_ADDRESSES = [
    ("456 Oak Avenue, Brooklyn, NY 11201", 40.6892, -73.9857),
    ("789 Elm Street, San Francisco, CA 94102", 37.7749, -122.4194),
    ("321 Maple Drive, Austin, TX 78701", 30.2672, -97.7431),
    ("555 Pine Road, Chicago, IL 60601", 41.8781, -87.6298),
    ("101 Cedar Lane, Miami, FL 33101", 25.7617, -80.1918),
    ("222 Birch Court, Seattle, WA 98101", 47.6062, -122.3321),
    ("333 Walnut Street, Denver, CO 80202", 39.7392, -104.9903),
    ("444 Spruce Way, Portland, OR 97201", 45.5152, -122.6784),
    ("900 Magnolia Blvd, Nashville, TN 37203", 36.1627, -86.7816),
    ("715 Chestnut Street, Philadelphia, PA 19106", 39.9526, -75.1652),
    ("208 Peachtree Lane, Atlanta, GA 30303", 33.7490, -84.3880),
    ("412 Willow Creek Road, Phoenix, AZ 85004", 33.4484, -112.0740),
    ("630 Harbor Drive, San Diego, CA 92101", 32.7157, -117.1611),
    ("118 Riverside Avenue, Minneapolis, MN 55401", 44.9778, -93.2650),
    ("527 Summit Street, Kansas City, MO 64105", 39.0997, -94.5786),
    ("843 Bayshore Drive, Tampa, FL 33602", 27.9506, -82.4572),
]


def _random_restaurant_metadata(rng, salt=""):
    """Return randomized but realistic restaurant metadata fields.

    The *salt* string is mixed into the address selection so that
    different scenarios calling with the same ``rng`` state still
    get different addresses.
    """
    if salt:
        idx = int(hashlib.md5(salt.encode()).hexdigest(), 16) % len(_ADDRESSES)
        addr, lat, lng = _ADDRESSES[idx]
    else:
        addr, lat, lng = rng.choice(_ADDRESSES)
    return {
        "address": addr,
        "latitude": lat,
        "longitude": lng,
        "rating": round(rng.uniform(3.5, 4.9), 1),
        "delivery_fee": round(rng.uniform(1.50, 5.99), 2),
        "min_order": round(rng.choice([7.0, 8.0, 10.0, 12.0, 15.0, 20.0]), 2),
        "delivery_radius": rng.choice([5, 6, 7, 8, 10, 12]),
    }


def build_standard_restaurant_mockdata(mockdata_dir, restaurant_name,
                                        item_name, price, category_name="Menu",
                                        description="", calories=0,
                                        restaurant_description="",
                                        is_popular=0, rng=None,
                                        cuisine=None):
    """Build mockdata for a restaurant with one category and one menu item."""
    from pathlib import Path
    mockdata_dir = Path(mockdata_dir)

    rest_kwargs = {}
    if restaurant_description:
        rest_kwargs["description"] = restaurant_description
    if rng is not None:
        meta = _random_restaurant_metadata(rng, salt=restaurant_name)
        rest_kwargs.update({
            "address": meta["address"],
            "latitude": meta["latitude"],
            "longitude": meta["longitude"],
            "rating": meta["rating"],
            "delivery_fee": meta["delivery_fee"],
            "min_order": meta["min_order"],
            "delivery_radius": meta["delivery_radius"],
        })

    if category_name == "Menu" and cuisine:
        category_name = cuisine_category(cuisine, rng) if rng else cuisine

    write_mockdata(
        mockdata_dir / "mock-restaurants.json",
        [restaurant_record(restaurant_name, **rest_kwargs)],
    )
    write_mockdata(
        mockdata_dir / "mock-categories.json",
        [category_record(category_name)],
    )
    write_mockdata(
        mockdata_dir / "mock-menu_items.json",
        [menu_item_record(item_name, price, description=description,
                          calories=calories, is_popular=is_popular)],
    )


class SearchQueryBatch(BaseModel):
    queries: List[str]


def search_query_prompt(category: str, count: int) -> str:
    return (
        f"Generate exactly {count} realistic food delivery search queries "
        f"that a user might type in a food delivery app. Category: {category}. "
        f"Queries should be short (1-3 words) and natural. "
        f"Ensure variety. Return JSON with key 'queries' as a list of strings."
    )


class AddressBatch(BaseModel):
    addresses: List[str]
    cities: List[str]
    states: List[str]
    postcodes: List[str]


def address_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} realistic US street addresses for a "
        f"food delivery app. For each, provide a street address, city, "
        f"state abbreviation, and 5-digit zip code. "
        f"Ensure variety in locations. Return JSON with keys 'addresses', "
        f"'cities', 'states', 'postcodes' as parallel arrays of strings."
    )


class RestaurantItemBatch(BaseModel):
    restaurant_names: List[str]
    restaurant_descriptions: List[str]
    item_names: List[str]
    item_descriptions: List[str]
    prices: List[float]
    calories: List[int]


def restaurant_item_prompt(cuisine: str, count: int) -> str:
    return (
        f"Generate exactly {count} unique, realistic restaurant name and "
        f"menu item pairs for a food delivery app. Cuisine: {cuisine}. "
        f"Restaurant names should be creative and unique (2-3 words). "
        f"Each restaurant needs a short, distinct description (1 sentence) "
        f"that is NOT generic -- mention a signature style or specialty. "
        f"Menu items should be specific dishes from that cuisine. "
        f"Use only plain ASCII characters -- no special dashes or quotes. "
        f"Prices should be realistic USD values between 5.00 and 25.00. "
        f"Return JSON with keys 'restaurant_names', 'restaurant_descriptions', "
        f"'item_names', 'item_descriptions', 'prices', 'calories' "
        f"as parallel arrays."
    )


class CategoryBatch(BaseModel):
    categories: List[str]
    restaurant_names: List[str]
    restaurant_descriptions: List[str]


def category_prompt(food_type: str, count: int) -> str:
    return (
        f"Generate exactly {count} unique, realistic food category names "
        f"and a restaurant that would serve them. Food type: {food_type}. "
        f"Categories should be short (1-2 words) like 'Burgers', 'Sushi', "
        f"'BBQ', 'Salads', 'Dim Sum'. "
        f"Restaurant names should be creative (2-3 words). "
        f"Each restaurant needs a short, distinct description (1 sentence) "
        f"that is NOT generic -- mention a signature style or specialty. "
        f"Use only plain ASCII characters -- no special dashes or quotes. "
        f"Return JSON with keys 'categories', 'restaurant_names', "
        f"and 'restaurant_descriptions' as parallel arrays of strings."
    )
