<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Auction App Data Generation Documentation

## Overview

This document describes the data generation process and mapping relationships for the auction marketplace application's mock data. The data generator uses **Python's Faker library** to create realistic, deterministic mock data for testing and development purposes.

## Data Generation Technology Stack

- **Primary Tool:** Python's Faker library
- **Language:** Python 3.x
- **Deterministic Seed:** Fixed seed (42) for reproducibility
- **Output Format:** JSON files compatible with SQLite database schema

## Data Structure

### Entity Relationships

The auction app uses the following core entities and their relationships:

```
Categories (5 fixed)
    ↓
Items (100 items)
    ├──→ Users (as sellers) - Many-to-one
    ├──→ Categories - Many-to-one
    └──→ Bids (when auction_flag = 1) - One-to-many
         └──→ Users (as bidders) - Many-to-one
              └──→ Sessions - One-to-many
                   └──→ Transactions - One-to-many
                        ├──→ Payments - One-to-many
                        │    └──→ Mock Cards (reference)
                        └──→ Inventory - One-to-many
```

**Key Relationship Notes:**
- **Users** serve dual roles: they can be **sellers** (list items) and **buyers/bidders** (purchase/bid on items)
- **Items** reference users via `seller_id` (the user who listed the item)
- **Bids** reference users via `user_id` (the user placing the bid)
- **Transactions** can reference both `user_id` (buyer) and `seller_id` (seller)
- **Inventory** tracks items purchased by users

### Core Entities

#### Categories (`mock-categories.json`)
- **Fixed Set:** 5 predefined categories
- **Count:** Always 5 (not configurable)
- **Fields:**
  - `id`: INTEGER (1-5) - Primary key, auto-incrementing
  - `code`: TEXT - Lowercase code ('electronics', 'books', 'fashion', 'home', 'toys')
  - `name`: TEXT - Display name ('Electronics', 'Books', 'Fashion', 'Home', 'Toys')
  - `description`: TEXT - Category description
  - `created_at`: TEXT - SQLite timestamp format (`YYYY-MM-DD HH:MM:SS.fff`)

**Categories:**
1. **Electronics** (`code: 'electronics'`) - Electronic devices and gadgets
2. **Books** (`code: 'books'`) - Books, magazines, and reading materials
3. **Fashion** (`code: 'fashion'`) - Clothing, accessories, and fashion items
4. **Home** (`code: 'home'`) - Home decor, furniture, and household items
5. **Toys** (`code: 'toys'`) - Toys, games, and children's items

**Relationships:**
- One-to-many with Items (each category can have many items)
- Referenced by Items via `category_id` foreign key

#### Users (`mock-users.json`)
- **Count:** 35 users (configurable via `NUM_USERS`)
- **Purpose:** Unified entity representing both sellers and buyers/bidders
- **Seller Functionality:** ~60% of users have seller stats (can list items)
- **Fields:**
  - `id`: INTEGER (1-35) - Primary key, auto-incrementing
  - `username`: TEXT - Unique username (lowercase, generated)
  - `email`: TEXT - Email using `@example.com` domain
  - `name`: TEXT - Full name (generated: first + last name)
  - `seller_rating`: REAL - Seller rating (0.0-5.0, 0.0 if not a seller)
  - `total_sales`: INTEGER - Total sales count (0 if not a seller)
  - `total_items_listed`: INTEGER - Total items listed (0 if not a seller)
  - `created_at`: TEXT - SQLite timestamp (past 2 years)
  - `updated_at`: TEXT - SQLite timestamp (recent 30 days)

**Seller Identification:**
A user is considered a seller if:
- `seller_rating > 0` OR
- `total_items_listed > 0`

**Relationships:**
- One-to-many with Items (as seller via `seller_id`)
- One-to-many with Bids (as bidder via `user_id`)
- One-to-many with Transactions (as buyer via `user_id` or seller via `seller_id`)
- One-to-many with Inventory (items purchased)
- One-to-many with Sessions (test sessions)
- One-to-many with Listings (items listed)

**Database Constraints:**
- `username` is UNIQUE
- Foreign key references use `ON DELETE RESTRICT` for seller relationships
- Foreign key references use `ON DELETE CASCADE` for bidder relationships

#### Items (`mock-items.json`)
- **Count:** 100 items (configurable via `NUM_ITEMS`)
- **Distribution:** ~40% auctions, ~60% buy-now
- **Fields:**
  - `id`: INTEGER (1-100) - Primary key, auto-incrementing
  - `title`: TEXT - Generated product title (category-specific)
  - `description`: TEXT - Generated product description (max 200 chars)
  - `category_id`: INTEGER - Foreign key to Categories (1-5)
  - `seller_id`: INTEGER - Foreign key to Users (the seller who listed this item)
  - `price`: REAL - Base price (category-specific ranges)
  - `auction_flag`: INTEGER - 1 = auction, 0 = buy-now
  - `status`: TEXT - Item status ('active', 'sold', 'cancelled', 'expired')
  - `quantity`: INTEGER - Inventory quantity (1-10)
  - `bid_count`: INTEGER - Number of bids on this item (0 for buy-now items)
  - `created_at`: TEXT - SQLite timestamp (past 6 months)
  - `updated_at`: TEXT - SQLite timestamp (recent 7 days)
  - `sold_at`: TEXT - When item was sold (nullable)

**Auction-specific fields** (when `auction_flag = 1`):
- `starting_bid`: REAL - Starting bid amount (70% of base price)
- `current_bid`: REAL - Current highest bid (75% of base price)
- `bid_increment`: REAL - Minimum bid increment (1.0-10.0)
- `end_time`: INTEGER - Unix timestamp (seconds since epoch, 1-14 days from now)

**Buy-now items** (when `auction_flag = 0`):
- No auction fields (`starting_bid`, `current_bid`, `bid_increment`, `end_time`)
- `bid_count` is always 0
- Can be purchased immediately at `price`

**Category-specific price ranges:**
- **Electronics:** $29.99 - $1,299.99
- **Books:** $5.99 - $49.99
- **Fashion:** $14.99 - $199.99
- **Home:** $19.99 - $499.99
- **Toys:** $9.99 - $149.99

**Title Generation Patterns:**
- **Electronics:** `{word} {word} {word}` (e.g., "Smart Wireless Headphones")
- **Books:** `{sentence} by {author name}` (e.g., "The Art Of Programming by John Smith")
- **Fashion:** `{word} {word} - {color}` (e.g., "Designer Jacket - Blue")
- **Home:** `{word} {word} for {word}` (e.g., "Modern Lamp for Living")
- **Toys:** `{word} {word} - {word}` (e.g., "Educational Puzzle - Classic")

**Relationships:**
- Many-to-one with Categories (via `category_id`)
- Many-to-one with Users as seller (via `seller_id`, `ON DELETE RESTRICT`)
- One-to-many with Bids (auction items only)
- One-to-many with Transactions
- One-to-many with Inventory (when purchased)

**Database Constraints:**
- `category_id` is NOT NULL
- `seller_id` is NOT NULL
- `price` must be >= 0
- `quantity` must be >= 0
- `auction_flag = 1` requires `starting_bid IS NOT NULL AND end_time IS NOT NULL`
- `status` must be one of: 'active', 'sold', 'cancelled', 'expired'


**Relationships:**
- Referenced by Payments table for deterministic payment outcomes
- Used to simulate payment success/failure scenarios

**Database Constraints:**
- `card_number` is UNIQUE
- `card_type` is NOT NULL
- `always_succeeds` must be 0 or 1

## Data Generation Process

The generation script (`auction_data-generator.py`) follows this sequence:

### 1. Initialization
```python
# Set seed for deterministic generation
SEED = 42
fake = Faker()
Faker.seed(SEED)
random.seed(SEED)
```

### 2. Generation Order

1. **Categories** - Generate 5 fixed categories
2. **Users** - Generate 35 users (~60% are sellers with seller stats)
3. **Items** - Generate 100 items (mix of auction/buy-now)
   - Select random category and seller user for each item
   - Apply category-specific pricing
   - 40% chance of being an auction item
   - Generate `bid_count` for auction items (0-25)
4. **Mock Cards** - Generate 10 predefined payment cards

### 3. User Generation Details

For each user:
- **Basic Info:** Generate username, email, name
- **Seller Status:** ~60% chance of being a seller
  - If seller: Generate `seller_rating` (3.0-5.0), `total_sales` (0-500), `total_items_listed` (0-100)
  - If not seller: Set seller fields to 0
- **Timestamps:** Generate `created_at` (past 2 years) and `updated_at` (recent 30 days)

### 4. Item Generation Details

For each item:
- **Category Selection:** Random selection from 5 categories
- **Seller Assignment:** Random user from seller users (users with seller stats)
- **Title Generation:** Category-specific title generators (see Title Generation Patterns above)
- **Price Calculation:** Random within category-specific range
- **Auction Logic:** 40% chance of being auction
  - If auction:
    - Calculate `starting_bid` (70% of base price)
    - Calculate `current_bid` (75% of base price)
    - Set `bid_increment` (1.0-10.0)
    - Set `end_time` to Unix timestamp (1-14 days from now)
    - Set `bid_count` (0-25)
  - If buy-now:
    - No auction fields
    - `bid_count` = 0

### 5. Output Files

All files are written to `src/data/` directory:

- `mock-categories.json` - 5 categories
- `mock-users.json` - 35 users (includes sellers)
- `mock-items.json` - 100 items
- `mock-cards.json` - 10 mock cards
- `summary.json` - Generation statistics and metadata

**Note:** No separate `mock-sellers.json` file - sellers are part of `mock-users.json`

## Field Naming Convention

All fields use **snake_case** to match the database schema exactly:

- `created_at` (not `createdAt`)
- `updated_at` (not `updatedAt`)
- `category_id` (not `categoryId`)
- `seller_id` (not `sellerId`)
- `auction_flag` (not `auctionFlag`)
- `starting_bid` (not `startingBid`)
- `end_time` (not `endTime`)
- `bid_count` (not `bidCount`)
- `seller_rating` (not `sellerRating`)
- `total_sales` (not `totalSales`)
- `total_items_listed` (not `totalItemsListed`)
- `card_type` (not `cardType`)
- `always_succeeds` (not `alwaysSucceeds`)
- `failure_reason` (not `failureReason`)

This ensures direct compatibility when loading data into the database.

## Email Domain Convention

All emails use the `@example.com` domain for easy identification and testing:

- Users (sellers and buyers): `{username}@example.com`

Example emails:
- `john.doe@example.com`
- `seller_user_1@example.com`
- `buyer_user_5@example.com`

## Timestamp Format

All timestamps use **SQLite format** (`YYYY-MM-DD HH:MM:SS.fff`) to match the database schema:

- Format: `'2024-01-15 14:30:45.123'`
- Generated using: `strftime('%Y-%m-%d %H:%M:%f', 'now')`
- Milliseconds included (`.fff`)

**Exception:** `end_time` in items uses Unix timestamp (INTEGER) for auction end times.

## Deterministic Generation

The generator uses a fixed seed (42) to ensure:
- **Reproducibility:** Same seed produces identical data
- **Consistency:** Data remains stable across runs
- **Testing:** Predictable outcomes for automated tests

To change the data, modify the `SEED` constant in the script.

## Usage

### Generate Data

```bash
# From the auction app directory
python src/data/auction_data-generator.py

# Or using npm script
npm run generate:data
```

### Output

The script will:
1. Generate all data entities
2. Write JSON files to `src/data/`
3. Create `summary.json` with generation statistics
4. Print summary to console

### Summary Output Example

```
🚀 Starting auction data generation...
📊 Seed: 42
📦 Generating categories...
🤖 Generating users (includes sellers)...
🛍️  Generating items...
💳 Generating mock cards...
💾 Writing data to files...
✅ Data generation complete!

📊 Summary:
   Categories: 5
   Users: 35 (including ~21 sellers)
   Items: 100
   - Auction items: 40
   - Buy-now items: 60
   Mock Cards: 10

📁 Files saved to: /path/to/src/data
```

## Database Schema Mapping

The generated JSON files map directly to database tables:

| JSON File | Database Table | Key Fields | Notes |
|-----------|---------------|------------|-------|
| `mock-categories.json` | `categories` | `id`, `code`, `name` | Fixed 5 categories |
| `mock-users.json` | `users` | `id`, `username`, `email`, `seller_rating` | Includes sellers |
| `mock-items.json` | `items` | `id`, `category_id`, `seller_id`, `auction_flag`, `bid_count` | Mix of auction/buy-now |
| `mock-cards.json` | `mock_cards` | `id`, `card_number`, `card_type`, `always_succeeds` | Payment testing |

**Important:** The `seller_id` in items references `users.id`, not a separate sellers table.

## Data Relationships Summary

### One-to-Many Relationships

1. **Categories → Items**
   - One category can have many items
   - Foreign key: `items.category_id` → `categories.id`

2. **Users → Items** (as sellers)
   - One user can list many items
   - Foreign key: `items.seller_id` → `users.id`
   - Constraint: `ON DELETE RESTRICT` (cannot delete user with listed items)

3. **Users → Bids** (as bidders)
   - One user can place many bids
   - Foreign key: `bids.user_id` → `users.id`
   - Constraint: `ON DELETE CASCADE` (bids deleted when user deleted)

4. **Items → Bids**
   - One item can have many bids (auction items only)
   - Foreign key: `bids.item_id` → `items.id`
   - Constraint: `ON DELETE CASCADE` (bids deleted when item deleted)

5. **Users → Transactions** (as buyer or seller)
   - One user can have many transactions
   - Foreign keys: `transactions.user_id` and `transactions.seller_id` → `users.id`
   - Constraint: `ON DELETE RESTRICT` (cannot delete user with transactions)

6. **Transactions → Payments**
   - One transaction can have many payment attempts
   - Foreign key: `payments.transaction_id` → `transactions.id`

7. **Users → Inventory**
   - One user can own many items
   - Foreign key: `inventory.user_id` → `users.id`
   - Constraint: `ON DELETE CASCADE` (inventory deleted when user deleted)

8. **Items → Inventory**
   - One item can be owned by many users (different quantities)
   - Foreign key: `inventory.item_id` → `items.id`
   - Constraint: `ON DELETE CASCADE` (inventory deleted when item deleted)

### Many-to-Many Relationships

1. **Users ↔ Items** (via Inventory)
   - Users can own multiple items
   - Items can be owned by multiple users
   - Junction table: `inventory`

2. **Users ↔ Items** (via Bids)
   - Users can bid on multiple items
   - Items can receive bids from multiple users
   - Junction table: `bids`

## Configuration

Modify these constants in `auction_data-generator.py` to customize generation:

```python
SEED = 42                    # Random seed for determinism
NUM_CATEGORIES = 5          # Fixed at 5 (not configurable)
NUM_USERS = 35              # Number of users (includes sellers)
NUM_ITEMS = 100             # Number of items
NUM_MOCK_CARDS = 10         # Number of mock cards
```

**Seller Ratio:** Currently ~60% of users are sellers. Modify the `is_seller` probability in `generate_users()` to change this.

**Auction Ratio:** Currently ~40% of items are auctions. Modify the `is_auction` probability in `generate_items()` to change this.

## Data Validation

### Required Fields
- Categories: `id`, `code`, `name`, `created_at`
- Users: `id`, `username`, `created_at`, `updated_at`
- Items: `id`, `title`, `category_id`, `seller_id`, `price`, `auction_flag`, `status`, `quantity`, `bid_count`, `created_at`, `updated_at`
- Mock Cards: `id`, `card_number`, `card_type`, `always_succeeds`, `created_at`

### Field Constraints
- All IDs are INTEGER (positive integers)
- All timestamps use SQLite format (`YYYY-MM-DD HH:MM:SS.fff`)
- `auction_flag` must be 0 or 1
- `status` must be one of: 'active', 'sold', 'cancelled', 'expired'
- `seller_rating` must be between 0.0 and 5.0
- `price` must be >= 0
- `quantity` must be >= 0
- `bid_count` must be >= 0
- Auction items must have `starting_bid` and `end_time` when `auction_flag = 1`

## Notes

- **Auction Items:** ~40% of items are auctions (configurable via probability)
- **Seller Users:** ~60% of users have seller functionality (configurable)
- **Price Ranges:** Category-specific to ensure realistic pricing
- **Timestamps:** All dates use SQLite format (`YYYY-MM-DD HH:MM:SS.fff`) except `end_time` (Unix timestamp)
- **Unix Timestamps:** Auction `end_time` uses Unix timestamp (seconds since epoch)
- **Deterministic Cards:** Mock cards have predefined success/failure patterns for testing payment flows
- **Bid Count:** Generated randomly for auction items (0-25), always 0 for buy-now items
- **Card Types:** Currently supports 'visa' and 'mastercard'

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**
   - Ensure `seller_id` in items references valid `users.id`
   - Ensure `category_id` in items references valid `categories.id` (1-5)

2. **Missing Seller Stats**
   - If no sellers found, check that users have `seller_rating > 0` or `total_items_listed > 0`
   - Increase seller probability in `generate_users()` if needed

3. **Auction Validation Errors**
   - Ensure auction items (`auction_flag = 1`) have `starting_bid` and `end_time`
   - Check that `end_time` is a Unix timestamp (INTEGER)

4. **Timestamp Format Errors**
   - Ensure all timestamps use SQLite format: `YYYY-MM-DD HH:MM:SS.fff`
   - Use `format_datetime()` helper function for consistency

## Related Documentation

- [Database Schema](./database.md)
- [Technical Implementation](./technical-implementation.md)
- [Feature Scope](./feature-scope.md)

