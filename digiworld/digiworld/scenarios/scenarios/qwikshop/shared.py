# Copyright (c) Meta Platforms, Inc. and affiliates.
"""Shared primitives for qwikshop scenario instance generation."""

from typing import Any, Dict, List, Tuple

from pydantic import BaseModel

from digiworld.scenarios.builders import write_mockdata


class OrderBatch(BaseModel):
    product_names: List[str]
    descriptions: List[str]
    categories: List[str]
    subcategories: List[str]


class ProductBatch(BaseModel):
    product_names: List[str]
    descriptions: List[str]
    short_descriptions: List[str]
    categories: List[str]
    subcategories: List[str]
    sellers: List[str]


class AddressBatch(BaseModel):
    first_names: List[str]
    last_names: List[str]
    streets: List[str]
    cities: List[str]
    states: List[str]
    zipcodes: List[str]
    countries: List[str]
    phones: List[str]


class CardHolderBatch(BaseModel):
    names: List[str]


def order_batch_prompt(count: int) -> str:
    return (
        f"Generate exactly {count} realistic product orders for a quick-shop "
        f"e-commerce app. For each, provide a product name, a short description "
        f"(1 sentence), a broad product category (e.g. 'Electronics'), and a "
        f"more specific subcategory (e.g. 'Headphones'). The subcategory must "
        f"be different from the category. "
        f"Ensure variety in products. Return JSON with keys 'product_names', "
        f"'descriptions', 'categories', 'subcategories' as parallel arrays."
    )


_VALID_QWIKSHOP_TAXONOMY: Dict[str, List[str]] = {
    "Automotive": [
        "Car Accessories",
        "Car Care",
        "Exterior Accessories",
        "Interior Accessories",
        "Tires & Wheels",
        "Tools & Equipment",
    ],
    "Beauty & Personal Care": [
        "Bath & Body",
        "Fragrances",
        "Hair Care",
        "Makeup",
        "Men's Grooming",
        "Nail Care",
        "Oral Care",
        "Skincare",
    ],
    "Books": [
        "Children's Books",
        "Comics",
        "Cookbooks",
        "Fiction",
        "Non-Fiction",
        "Science & Tech",
        "Self-Help",
        "Textbooks",
    ],
    "Clothing": [
        "Accessories",
        "Activewear",
        "Jackets",
        "Jeans",
        "Men's Shirts",
        "Shoes",
        "Swimwear",
        "Women's Dresses",
    ],
    "Electronics": [
        "Cameras",
        "Gaming Consoles",
        "Headphones",
        "Laptops",
        "Smartphones",
        "Smartwatches",
        "Speakers",
        "Tablets",
    ],
    "Health & Wellness": [
        "Air Purifiers",
        "First Aid",
        "Fitness Trackers",
        "Massage",
        "Medical Devices",
        "Supplements",
        "Vitamins",
    ],
    "Home & Kitchen": [
        "Bathroom",
        "Bedding",
        "Cookware",
        "Furniture",
        "Kitchen Tools",
        "Lighting",
        "Small Appliances",
        "Storage",
    ],
    "Pet Supplies": [
        "Aquarium Supplies",
        "Cat Food",
        "Dog Food",
        "Grooming Supplies",
        "Pet Beds",
        "Pet Health",
        "Pet Toys",
    ],
    "Sports & Outdoors": [
        "Camping Gear",
        "Cycling",
        "Fitness Equipment",
        "Hiking",
        "Running",
        "Team Sports",
        "Water Sports",
        "Yoga",
    ],
    "Toys & Games": [
        "Action Figures",
        "Board Games",
        "Building Sets",
        "Dolls",
        "Educational Toys",
        "Outdoor Toys",
        "Puzzles",
        "Video Games",
    ],
}

_CATEGORY_ALIASES = {
    "beauty": "Beauty & Personal Care",
    "books & stationery": "Books",
    "health": "Health & Wellness",
    "health & personal care": "Health & Wellness",
    "home": "Home & Kitchen",
    "home decor": "Home & Kitchen",
    "home & living": "Home & Kitchen",
    "kitchen": "Home & Kitchen",
    "office supplies": "Home & Kitchen",
    "outdoor": "Sports & Outdoors",
}

_SUBCATEGORY_ALIASES = {
    "audio": "Headphones",
    "audio accessories": "Headphones",
    "automatic feeders": "Pet Health",
    "bathroom mirrors": "Bathroom",
    "drinkware": "Kitchen Tools",
    "feeding accessories": "Pet Health",
    "gardening": "Small Appliances",
    "heart rate monitors": "Fitness Equipment",
    "journals": "Non-Fiction",
    "led lamps": "Lighting",
    "mattress accessories": "Bedding",
    "portable power": "Smartphones",
    "power accessories": "Smartphones",
    "shaving": "Men's Grooming",
    "soy candles": "Lighting",
    "travel mugs": "Kitchen Tools",
    "wearables": "Smartwatches",
}

_PAIR_ALIASES = {
    ("electronics", "audio"): ("Electronics", "Headphones"),
    ("electronics", "audio accessories"): ("Electronics", "Headphones"),
    ("health", "fitness trackers"): ("Health & Wellness", "Fitness Trackers"),
    ("health & personal care", "medical devices"): ("Health & Wellness", "Medical Devices"),
    ("sports & outdoors", "heart rate monitors"): ("Sports & Outdoors", "Fitness Equipment"),
}

_CATEGORY_DEFAULT_SUBCATEGORY = {
    category: subcategories[0]
    for category, subcategories in _VALID_QWIKSHOP_TAXONOMY.items()
}


def _normalize_key(value: str) -> str:
    return " ".join((value or "").strip().lower().split())


def normalize_product_taxonomy(category: str, subcategory: str) -> Tuple[str, str]:
    """Map generated product taxonomy to valid Qwikshop DB values."""
    raw_category_key = _normalize_key(category)
    raw_subcategory_key = _normalize_key(subcategory)

    if (raw_category_key, raw_subcategory_key) in _PAIR_ALIASES:
        return _PAIR_ALIASES[(raw_category_key, raw_subcategory_key)]

    valid_category_keys = {
        _normalize_key(name): name for name in _VALID_QWIKSHOP_TAXONOMY
    }
    valid_subcategory_keys = {
        category_name: {_normalize_key(name): name for name in subcategory_names}
        for category_name, subcategory_names in _VALID_QWIKSHOP_TAXONOMY.items()
    }

    normalized_category = valid_category_keys.get(
        raw_category_key,
        _CATEGORY_ALIASES.get(raw_category_key, category),
    )
    normalized_category = valid_category_keys.get(
        _normalize_key(normalized_category),
        normalized_category,
    )
    valid_subcategories = valid_subcategory_keys.get(normalized_category, {})

    normalized_subcategory = valid_subcategories.get(raw_subcategory_key)
    if not normalized_subcategory:
        aliased_subcategory = _SUBCATEGORY_ALIASES.get(raw_subcategory_key, subcategory)
        normalized_subcategory = valid_subcategories.get(
            _normalize_key(aliased_subcategory),
            _CATEGORY_DEFAULT_SUBCATEGORY.get(normalized_category, aliased_subcategory),
        )

    return normalized_category, normalized_subcategory


def product_record(
    name: str,
    description: str,
    short_description: str,
    category_name: str,
    subcategory_name: str,
    price: float,
    discount_percent: int = 0,
    seller: str = "Test Seller",
    rng: Any = None,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a product record for mockdata injection."""
    category_name, subcategory_name = normalize_product_taxonomy(category_name, subcategory_name)
    discounted_price = round(price * (1 - discount_percent / 100), 2) if discount_percent > 0 else price
    record = {
        "id": "{{auto_id}}",
        "name": name,
        "description": description,
        "shortDescription": short_description,
        "price": price,
        "discountedPrice": discounted_price,
        "discountPercent": discount_percent,
        "rating": round(rng.uniform(3.0, 5.0), 1) if rng else 4.5,
        "reviewCount": rng.randint(10, 500) if rng else 100,
        "seller": seller,
        "categoryName": category_name,
        "subcategoryName": subcategory_name,
        "inStock": 1,
        "stockCount": rng.randint(10, 200) if rng else 50,
        "imageUrl": f"/product_{rng.randint(1000, 9999)}" if rng else "/product_0",
        "specs": "{}",
        "tags": "[]",
        "isFeatured": 0,
    }
    record.update(overrides)
    return record


def address_record(
    full_name: str,
    street: str,
    city: str,
    state: str,
    pincode: str,
    phone: str,
    country: str = "United States",
    is_default: int = 0,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build an address record for mockdata injection."""
    record = {
        "id": "{{auto_id}}",
        "userId": 1,
        "fullName": full_name,
        "street": street,
        "city": city,
        "state": state,
        "pincode": pincode,
        "phone": phone,
        "country": country,
        "isDefault": is_default,
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
    """Build a payment method record for mockdata injection."""
    record = {
        "id": "{{auto_id}}",
        "userId": 1,
        "type": "card",
        "cardType": card_type,
        "nameOnCard": name_on_card,
        "cardNumber": card_number,
        "expiryMonth": expiry_month,
        "expiryYear": expiry_year,
        "isDefault": is_default,
    }
    record.update(overrides)
    return record


def cart_item_record(
    product_name: str,
    product_id: int,
    quantity: int,
    price: float,
    discounted_price: float,
    short_description: str = "",
    seller: str = "Test Seller",
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a cart item record for mockdata injection."""
    record = {
        "id": "{{auto_id}}",
        "cartId": 1,
        "userId": 1,
        "productId": product_id,
        "productName": product_name,
        "productImage": f"/product_{product_id}",
        "shortDescription": short_description,
        "seller": seller,
        "quantity": quantity,
        "price": price,
        "discountedPrice": discounted_price,
        "total": round(discounted_price * quantity, 2),
        "inStock": 1,
    }
    record.update(overrides)
    return record


def wishlist_record(
    product_id: int,
    **overrides: Any,
) -> Dict[str, Any]:
    """Build a wishlist record for mockdata injection."""
    record = {
        "id": "{{auto_id}}",
        "userId": "{{current_user_id}}",
        "productId": product_id,
    }
    record.update(overrides)
    return record


def generate_order_number(rng: Any) -> str:
    return f"ORD-{rng.randint(100000, 999999)}"


def order_record(
    order_number: str,
    product_name: str,
    description: str,
    category: str,
    subcategory: str,
    rng: Any,
    **overrides: Any,
) -> Dict[str, Any]:
    """Return an order record in the camelCase format expected by the
    ecommerce_mutation_adapter (insert_order / insert_order_item).

    The adapter reads keys like ``userId``, ``orderNumber``, ``grandTotal``,
    ``deliveryAddress`` (nested dict), and ``items`` (nested list) and handles
    mapping them to the database columns itself.
    """
    category, subcategory = normalize_product_taxonomy(category, subcategory)
    price = round(rng.uniform(15, 500), 2)
    shipping = round(rng.uniform(5, 25), 2)
    tax = round(price * 0.0825, 2)
    grand_total = round(price + shipping + tax, 2)
    record = {
        "id": "{{auto_id}}",
        "orderNumber": order_number,
        "userId": "{{current_user_id}}",
        "items": [
            {
                "id": rng.randint(9000, 9999),
                "productId": rng.randint(9000, 9999),
                "productName": product_name,
                "productImage": f"https://picsum.photos/seed/{rng.randint(1000, 9999)}/600/400",
                "shortDescription": description,
                "sku": f"SKU-{rng.randint(1000, 9999)}",
                "categoryName": category,
                "subcategoryName": subcategory,
                "seller": "Test Seller",
                "quantity": 1,
                "price": price,
                "discountedPrice": price,
                "total": price,
                "savedAmount": 0,
                "addedAt": "{{middle_timestamp}}",
                "inStock": True,
            }
        ],
        "subtotal": price,
        "totalSavings": 0,
        "shipping": shipping,
        "tax": tax,
        "couponDiscount": 0,
        "couponCode": None,
        "totalAmount": grand_total,
        "status": "Delivered",
        "statusHistory": [
            {
                "status": "Order Placed",
                "timestamp": "{{middle_timestamp}}",
                "description": "Your order has been received and is being processed.",
            },
            {
                "status": "Payment Confirmed",
                "timestamp": "{{middle_timestamp}}",
                "description": "Payment has been successfully processed.",
            },
            {
                "status": "Shipped",
                "timestamp": "{{middle_timestamp}}",
                "description": "Your order has been shipped and is on its way to you.",
            },
            {
                "status": "Delivered",
                "timestamp": "{{end_timestamp}}",
                "description": "Your order has been delivered successfully.",
            },
        ],
        "deliveryAddress": {
            "fullName": "{{current_user_address_full_name}}",
            "street": "{{current_user_address_street}}",
            "city": "{{current_user_address_city}}",
            "state": "{{current_user_address_state}}",
            "pincode": "{{current_user_address_pincode}}",
        },
        "paymentMethod": "Credit Card",
        "paymentStatus": "Completed",
        "orderDate": "{{middle_timestamp}}",
        "shippedDate": "{{middle_timestamp}}",
        "deliveryDate": "{{end_timestamp}}",
        "estimatedDeliveryDate": "{{end_timestamp}}",
        "trackingNumber": f"TRK-{rng.randint(100000, 999999)}",
        "courierPartner": "Express Shipping",
        "isGift": False,
        "giftMessage": None,
    }
    record.update(overrides)
    return record
