# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for auction scenario instance generation."""

import time
from typing import Any, Dict, List

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata
from digiworld.scenarios.constraints import EntityExistsConstraint, DataVolumeConstraint


class AuctionItemBatch(BaseModel):
    titles: List[str]
    descriptions: List[str]


AUCTION_CATEGORIES = {
    "electronics": 1,
    "books": 2,
    "fashion": 3,
    "home": 4,
    "toys": 5,
    "sports": 6,
    "automotive": 7,
    "collectibles": 8,
    "art": 9,
    "jewelry": 10,
    "music": 11,
    "health": 12,
}

CATEGORY_NAMES = {
    "electronics": "Electronics",
    "books": "Books & Manuscripts",
    "fashion": "Fashion & Clothing",
    "home": "Home & Garden",
    "toys": "Toys & Hobbies",
    "sports": "Sports Memorabilia",
    "automotive": "Vehicles",
    "collectibles": "Antiques & Collectibles",
    "art": "Art",
    "jewelry": "Jewelry & Watches",
    "music": "Musical Instruments",
    "health": "Health & Beauty",
}

TRANSACTION_TYPES = ["purchase", "bid_win", "listing", "sale", "refund"]

USER_HAS_ITEMS = EntityExistsConstraint(
    table="items", min_count=1, filter={"seller_id": 1}
)
USER_HAS_ACTIVE_AUCTIONS = DataVolumeConstraint(
    table="items", min_count=1,
    filter={"seller_id": 1, "auction_flag": 1, "status": "active"},
)
USER_HAS_ACTIVE_ITEMS = DataVolumeConstraint(
    table="items", min_count=1,
    filter={"seller_id": 1, "status": "active"},
)
ITEMS_EXIST = EntityExistsConstraint(table="items", min_count=1)
USER_HAS_PAYMENT_METHODS = EntityExistsConstraint(
    table="user_payment_methods", min_count=1, user_filter=True,
)
USER_HAS_TRANSACTIONS = EntityExistsConstraint(
    table="transactions", min_count=1, user_filter=True,
)


def item_batch_prompt(category: str, count: int) -> str:
    return (
        f"Generate exactly {count} creative, realistic auction item titles "
        f"and short descriptions for a {category} auction category. "
        f"Titles should be specific and appealing (e.g., 'Vintage Purple Toaster'). "
        f"Descriptions should be 1-2 sentences about condition and appeal. "
        f"Ensure variety. Return JSON with keys 'titles' and 'descriptions' "
        f"as parallel arrays."
    )


def _future_end_time(rng: Any) -> str:
    """Return a template that resolves to a future timestamp at load time.

    Using a template instead of a hardcoded Unix timestamp ensures the
    auction is always in the future, even if instances were generated
    days or weeks ago.
    """
    return "{{future_end_time}}"


_item_id_counter = 0


def generate_item_id(rng: Any) -> int:
    """Generate a unique high ID safe for cross-table FK references.

    Uses a monotonic counter to guarantee uniqueness within a generation
    run, plus a timestamp base to avoid collisions across runs.
    """
    global _item_id_counter
    _item_id_counter += 1
    ts_base = int(time.time()) % 100_000
    return 10_000_000 + ts_base * 10_000 + _item_id_counter


def item_record(
    title: str,
    description: str,
    category_id: int,
    rng: Any,
    **overrides: Any,
) -> Dict[str, Any]:
    price = round(rng.uniform(25, 2500), 2)
    starting_bid = round(price * rng.uniform(0.3, 0.6), 2)
    current_bid = round(starting_bid * rng.uniform(1.0, 1.8), 2)
    record = {
        "id": "{{auto_id}}",
        "title": title,
        "description": description,
        "categoryId": category_id,
        "sellerId": "{{current_user_id}}",
        "price": price,
        "auctionFlag": 1,
        "status": "active",
        "quantity": 1,
        "bidCount": rng.randint(0, 15),
        "imageUrl": f"https://example.com/images/{title.lower().replace(' ', '-')}.jpg",
        "createdAt": "{{recent_timestamp}}",
        "updatedAt": "{{recent_timestamp}}",
        "startingBid": starting_bid,
        "currentBid": current_bid,
        "bidIncrement": 5.00,
        "endTime": _future_end_time(rng),
        "expired": 0,
    }
    record.update(overrides)
    return record


def listing_record(
    item_id: Any,
    list_price: float,
    status: str = "active",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "itemId": item_id,
        "listPrice": list_price,
        "listDate": "{{recent_timestamp}}",
        "status": status,
    }
    record.update(overrides)
    return record


def payment_method_record(
    card_number: str,
    card_type: str = "visa",
    expiry: str = "12/28",
    card_holder_name: str = "Test User",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "cardType": card_type,
        "cardNumber": card_number,
        "expiry": expiry,
        "cardHolderName": card_holder_name,
        "isDefault": 0,
        "createdAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


def bid_record(
    item_id: Any,
    bid_amount: float,
    outcome: str = "pending",
    is_winning: int = 0,
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "itemId": item_id,
        "userId": "{{current_user_id}}",
        "bidAmount": bid_amount,
        "outcome": outcome,
        "isWinning": is_winning,
        "bidTime": int(time.time()),
        "createdAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record


def transaction_record(
    item_id: Any,
    amount: float,
    transaction_type: str = "purchase",
    status: str = "completed",
    **overrides: Any,
) -> Dict[str, Any]:
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "sellerId": 2,
        "itemId": item_id,
        "transactionType": transaction_type,
        "amount": amount,
        "quantity": 1,
        "status": status,
        "paymentStatus": "success",
        "transactionDate": "{{recent_timestamp}}",
        "createdAt": "{{recent_timestamp}}",
    }
    record.update(overrides)
    return record
