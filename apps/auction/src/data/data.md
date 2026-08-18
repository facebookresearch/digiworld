<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Auction App Data Generation Documentation

## Overview

This document describes the data generation process and mapping relationships for the auction marketplace application's mock data. The data generator uses **Python's Faker library** to create realistic, deterministic mock data for testing and development purposes.

## Data Generation Technology Stack

- **Primary Tool:** Python's Faker library
- **Language:** Python 3.x
- **Deterministic Seed:** Fixed seed (42) for reproducibility
- **Output Format:** JSON files compatible with SQLite database schema
- **Field Naming:** camelCase (matches Drizzle schema)

## Data Structure

### Entity Relationships

The auction app uses the following core entities and their relationships:

```
Categories (12 fixed)
    ↓
Items (250 items)
    ├──→ Users (as sellers) - Many-to-one
    ├──→ Categories - Many-to-one
    └──→ Bids (when auctionFlag = 1) - One-to-many
         └──→ Users (as bidders) - Many-to-one
              └──→ Transactions - One-to-many
                   ├──→ Payments - One-to-many
                   └──→ Inventory - One-to-many
Users
    ├──→ Payment Methods - One-to-many
    └──→ Addresses - One-to-many
```

**Key Relationship Notes:**
- **Users** serve dual roles: they can be **sellers** (list items) and **buyers/bidders** (purchase/bid on items)
- **Items** reference users via `sellerId` (the user who listed the item)
- **Bids** reference users via `userId` (the user placing the bid)
- **Transactions** can reference both `userId` (buyer) and `sellerId` (seller)
- **Inventory** tracks items purchased by users
- **Payment Methods** are associated with users for making purchases
- **Addresses** are associated with users for shipping

### Core Entities

#### Categories (`mock-categories.json`)
- **Fixed Set:** 12 predefined categories
- **Count:** Always 12 (not configurable)
- **Fields:**
  - `id`: INTEGER (1-12) - Primary key, auto-incrementing
  - `code`: TEXT - Lowercase code ('electronics', 'books', 'fashion', etc.)
  - `name`: TEXT - Display name ('Electronics', 'Books', 'Fashion', etc.)
  - `description`: TEXT - Category description
  - `createdAt`: TEXT - SQLite timestamp format (`YYYY-MM-DD HH:MM:SS.fff`)

**Categories:**
1. **Electronics** (`code: 'electronics'`) - Electronic devices and gadgets
2. **Books** (`code: 'books'`) - Books, magazines, and reading materials
3. **Fashion** (`code: 'fashion'`) - Clothing, accessories, and fashion items
4. **Home** (`code: 'home'`) - Home decor, furniture, and household items
5. **Toys** (`code: 'toys'`) - Toys, games, and children's items
6. **Sports & Outdoors** (`code: 'sports'`) - Sports equipment, outdoor gear, and fitness items
7. **Automotive** (`code: 'automotive'`) - Car parts, accessories, and automotive supplies
8. **Collectibles** (`code: 'collectibles'`) - Rare items, antiques, and collectible memorabilia
9. **Art & Crafts** (`code: 'art'`) - Artwork, craft supplies, and handmade items
10. **Jewelry & Watches** (`code: 'jewelry'`) - Fine jewelry, watches, and accessories
11. **Music & Instruments** (`code: 'music'`) - Musical instruments, records, and audio equipment
12. **Health & Beauty** (`code: 'health'`) - Health products, beauty items, and personal care

**Relationships:**
- One-to-many with Items (each category can have many items)
- Referenced by Items via `categoryId` foreign key

#### Users (`mock-users.json`)
- **Count:** 35 users (configurable via `NUM_USERS`)
- **Purpose:** Unified entity representing both sellers and buyers/bidders
- **Seller Functionality:** ~60% of users have seller stats (can list items)
- **Fields:**
  - `id`: INTEGER (1-35) - Primary key, auto-incrementing
  - `username`: TEXT - Unique username (lowercase, generated)
  - `email`: TEXT - Email using `@example.com` domain
  - `name`: TEXT - Full name (generated: first + last name)
  - `password`: TEXT - Simple password from predefined list (for easy testing)
  - `sellerRating`: REAL - Seller rating (0.0-5.0, 0.0 if not a seller)
  - `totalSales`: INTEGER - Total sales count (0 if not a seller)
  - `totalItemsListed`: INTEGER - Total items listed (0 if not a seller)
  - `createdAt`: TEXT - SQLite timestamp (past 2 years)
  - `updatedAt`: TEXT - SQLite timestamp (recent 30 days)

**Seller Identification:**
A user is considered a seller if:
- `sellerRating > 0` OR
- `totalItemsListed > 0`

**Password Convention:**
All users use simple passwords from a predefined list for easy testing:
- `password123`, `qwerty123`, `welcome123`, `letmein123`, `test123`, `admin123`, `user123`, `demo123`, `auction123`, `bid123`

**Relationships:**
- One-to-many with Items (as seller via `sellerId`)
- One-to-many with Bids (as bidder via `userId`)
- One-to-many with Transactions (as buyer via `userId` or seller via `sellerId`)
- One-to-many with Inventory (items purchased)
- One-to-many with Sessions (test sessions)
- One-to-many with Payment Methods
- One-to-many with Addresses

**Database Constraints:**
- `username` is UNIQUE
- Foreign key references use `ON DELETE RESTRICT` for seller relationships
- Foreign key references use `ON DELETE CASCADE` for bidder relationships

#### Items (`mock-items.json`)
- **Count:** 250 items (configurable via `NUM_ITEMS`)
- **Distribution:** ~40% auctions, ~60% buy-now
- **Fields:**
  - `id`: INTEGER (1-250) - Primary key, auto-incrementing
  - `title`: TEXT - Generated product title (category-specific)
  - `description`: TEXT - Generated product description (max 200 chars)
  - `categoryId`: INTEGER - Foreign key to Categories (1-12)
  - `sellerId`: INTEGER - Foreign key to Users (the seller who listed this item)
  - `price`: REAL - Base price (category-specific ranges)
  - `auctionFlag`: INTEGER - 1 = auction, 0 = buy-now
  - `status`: TEXT - Item status ('active', 'sold', 'cancelled', 'expired')
  - `quantity`: INTEGER - Inventory quantity (1-10)
  - `bidCount`: INTEGER - Number of bids on this item (0 for buy-now items)
  - `imageUrl`: TEXT - Image URL (cycles through 100 different images)
  - `createdAt`: TEXT - SQLite timestamp (past 6 months)
  - `updatedAt`: TEXT - SQLite timestamp (recent 7 days)

**Auction-specific fields** (when `auctionFlag = 1`):
- `startingBid`: REAL - Starting bid amount (70% of base price)
- `currentBid`: REAL - Current highest bid (updated after bids are generated)
- `bidIncrement`: REAL - Minimum bid increment (1.0-5.0)
- `endTime`: INTEGER - Unix timestamp (seconds since epoch, 1-14 days from now)

**Buy-now items** (when `auctionFlag = 0`):
- No auction fields (`startingBid`, `currentBid`, `bidIncrement`, `endTime`)
- `bidCount` is always 0
- Can be purchased immediately at `price`

**Category-specific price ranges:**
- **Electronics:** $29.99 - $1,299.99
- **Books:** $5.99 - $49.99
- **Fashion:** $14.99 - $199.99
- **Home:** $19.99 - $499.99
- **Toys:** $9.99 - $149.99
- **Sports & Outdoors:** $24.99 - $599.99
- **Automotive:** $19.99 - $799.99
- **Collectibles:** $15.99 - $2,999.99
- **Art & Crafts:** $9.99 - $499.99
- **Jewelry & Watches:** $29.99 - $4,999.99
- **Music & Instruments:** $49.99 - $1,999.99
- **Health & Beauty:** $8.99 - $199.99

**Title Generation Patterns:**
- **Electronics:** `{word} {word} {word}` (e.g., "Smart Wireless Headphones")
- **Books:** `{sentence} by {author name}` (e.g., "The Art Of Programming by John Smith")
- **Fashion:** `{word} {word} - {color}` (e.g., "Designer Jacket - Blue")
- **Home:** `{word} {word} for {word}` (e.g., "Modern Lamp for Living")
- **Toys:** `{word} {word} - {word}` (e.g., "Educational Puzzle - Classic")
- **Sports & Outdoors:** `{word} {word} {word}` (e.g., "Professional Running Shoes")
- **Automotive:** `{word} {word} for {word}` (e.g., "Car Accessory for Engine")
- **Collectibles:** `Vintage {word} {word}` (e.g., "Vintage Collectible Item")
- **Art & Crafts:** `{word} {word} - {color}` (e.g., "Handmade Art - Red")
- **Jewelry & Watches:** `{word} {word} {word}` (e.g., "Diamond Gold Ring")
- **Music & Instruments:** `{word} {word} {word}` (e.g., "Acoustic Guitar Strings")
- **Health & Beauty:** `{word} {word} - {word}` (e.g., "Beauty Product - Natural")

**Relationships:**
- Many-to-one with Categories (via `categoryId`)
- Many-to-one with Users as seller (via `sellerId`, `ON DELETE RESTRICT`)
- One-to-many with Bids (auction items only)
- One-to-many with Transactions
- One-to-many with Inventory (when purchased)

**Database Constraints:**
- `categoryId` is NOT NULL
- `sellerId` is NOT NULL
- `price` must be >= 0
- `quantity` must be >= 0
- `auctionFlag = 1` requires `startingBid IS NOT NULL AND endTime IS NOT NULL`
- `status` must be one of: 'active', 'sold', 'cancelled', 'expired'

#### Payment Methods (`mock-payment_methods.json`)
- **Count:** Variable (0-3 cards per user, average ~2 cards per user)
- **Purpose:** User payment methods for making purchases
- **Fields:**
  - `id`: INTEGER - Primary key, auto-incrementing
  - `userId`: INTEGER - Foreign key to Users
  - `cardType`: TEXT - Card type ('visa', 'mastercard', 'discover', 'amex')
  - `cardNumber`: TEXT - Full card number (e.g., '7126 3646 9837 9689')
  - `expiry`: TEXT - Expiry date (e.g., '01/28')
  - `cardHolderName`: TEXT - Cardholder name (user's name in uppercase)
  - `isDefault`: BOOLEAN - Whether this is the default payment method
  - `createdAt`: TEXT - SQLite timestamp (past year)

**Generation Logic:**
- Each user gets 0-3 payment methods (random)
- First card is always set as default (`isDefault: true`)
- Card type is randomly selected from available providers
- Card number and expiry are generated using Faker

**Relationships:**
- Many-to-one with Users (via `userId`)
- Referenced by Transactions for payment processing

**Database Constraints:**
- `userId` is NOT NULL
- `cardType` is NOT NULL
- `cardNumber` is NOT NULL

#### Addresses (`mock-addresses.json`)
- **Count:** Variable (1-2 addresses per user)
- **Purpose:** User shipping addresses
- **Fields:**
  - `id`: INTEGER - Primary key, auto-incrementing
  - `userId`: INTEGER - Foreign key to Users
  - `street`: TEXT - Street address
  - `city`: TEXT - City name
  - `state`: TEXT - State abbreviation (2 letters)
  - `zipCode`: TEXT - ZIP code
  - `country`: TEXT - Country (default: 'USA')
  - `isDefault`: BOOLEAN - Whether this is the default address
  - `createdAt`: TEXT - SQLite timestamp (past year)

**Generation Logic:**
- Each user gets 1-2 addresses (random)
- First address is always set as default (`isDefault: true`)
- All addresses are in USA for simplicity

**Relationships:**
- Many-to-one with Users (via `userId`)
- Referenced by Transactions for shipping

**Database Constraints:**
- `userId` is NOT NULL
- `country` defaults to 'USA'

#### Bids (`mock-bids.json`)
- **Count:** Variable (3-8 bids per auction item)
- **Purpose:** Bids placed on auction items
- **Fields:**
  - `id`: INTEGER - Primary key, auto-incrementing
  - `sessionId`: INTEGER - Foreign key to Sessions (nullable)
  - `itemId`: INTEGER - Foreign key to Items (auction items only)
  - `userId`: INTEGER - Foreign key to Users (the bidder)
  - `bidAmount`: REAL - Bid amount (increasing with each bid)
  - `isWinning`: INTEGER - 1 if winning bid, 0 otherwise
  - `outcome`: TEXT - Bid outcome ('pending' for winning, 'outbid' for others)
  - `bidTime`: INTEGER - Unix timestamp (seconds since epoch)
  - `deterministicSeed`: INTEGER - Seed for deterministic outcomes (nullable)
  - `createdAt`: TEXT - SQLite timestamp

**Generation Logic:**
- Only generated for auction items (`auctionFlag = 1`)
- 3-8 bids per auction item
- Bids are placed by users other than the seller
- Bid amounts increase incrementally based on `bidIncrement`
- Only the highest bid is marked as winning (`isWinning: 1`)
- Bid times progress chronologically from auction start to end
- After generation, `bidCount` and `currentBid` are updated on items

**Relationships:**
- Many-to-one with Items (via `itemId`)
- Many-to-one with Users (via `userId`)
- Many-to-one with Sessions (via `sessionId`, nullable)
- One-to-one with Transactions (winning bids can result in transactions)

**Database Constraints:**
- `itemId` is NOT NULL
- `userId` is NOT NULL
- `bidAmount` must be >= starting bid
- Only one winning bid per item (`isWinning = 1`)

#### Transactions (`mock-transactions.json`)
- **Count:** Variable
  - ~30% of buy-now items result in purchase transactions
  - ~20% of winning bids result in bid_win transactions
- **Purpose:** Record of purchases and auction wins
- **Fields:**
  - `id`: INTEGER - Primary key, auto-incrementing
  - `sessionId`: INTEGER - Foreign key to Sessions (nullable)
  - `transactionType`: TEXT - Type ('purchase' or 'bid_win')
  - `itemId`: INTEGER - Foreign key to Items
  - `userId`: INTEGER - Foreign key to Users (buyer)
  - `sellerId`: INTEGER - Foreign key to Users (seller)
  - `bidId`: INTEGER - Foreign key to Bids (for bid_win transactions, nullable)
  - `amount`: REAL - Transaction amount
  - `quantity`: INTEGER - Quantity purchased
  - `status`: TEXT - Transaction status ('completed', 'pending', 'cancelled')
  - `paymentStatus`: TEXT - Payment status ('success', 'failed', 'pending')
  - `paymentMethod`: TEXT - Payment method ('credit_card')
  - `paymentCardNumber`: TEXT - Last 4 digits of card
  - `failureReason`: TEXT - Failure reason if payment failed (nullable)
  - `refundAmount`: REAL - Refund amount (0 if no refund)
  - `refundedAt`: TEXT - Refund timestamp (nullable)
  - `transactionDate`: TEXT - SQLite timestamp
  - `createdAt`: TEXT - SQLite timestamp
  - `metadata`: TEXT - Additional metadata (nullable)

**Transaction Types:**
1. **Purchase** (`transactionType: 'purchase'`)
   - For buy-now items
   - ~30% of buy-now items are purchased
   - Quantity can be 1-3 (limited by item quantity)
   - Updates item quantity and status

2. **Bid Win** (`transactionType: 'bid_win'`)
   - For auction items won by highest bidder
   - ~20% of winning bids result in completed purchases
   - Quantity is always 1
   - References the winning bid via `bidId`
   - Updates item status to 'sold'

**Relationships:**
- Many-to-one with Items (via `itemId`)
- Many-to-one with Users as buyer (via `userId`)
- Many-to-one with Users as seller (via `sellerId`)
- Many-to-one with Bids (via `bidId`, for bid_win transactions)
- Many-to-one with Sessions (via `sessionId`, nullable)
- One-to-many with Payments
- One-to-many with Inventory

**Database Constraints:**
- `itemId` is NOT NULL
- `userId` is NOT NULL
- `sellerId` is NOT NULL
- `amount` must be >= 0
- `quantity` must be >= 1
- `transactionType` must be 'purchase' or 'bid_win'

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

1. **Categories** - Generate 12 fixed categories
2. **Users** - Generate 35 users (~60% are sellers with seller stats)
3. **Items** - Generate 250 items (mix of auction/buy-now)
   - Select random category and seller user for each item
   - Apply category-specific pricing
   - 40% chance of being an auction item
   - Generate image URLs (cycles through 100 images)
4. **Payment Methods** - Generate 0-3 cards per user
5. **Addresses** - Generate 1-2 addresses per user
6. **Bids** - Generate 3-8 bids per auction item
   - Update item `bidCount` and `currentBid` after generation
7. **Transactions** - Generate purchase and bid_win transactions
   - ~30% of buy-now items result in purchases
   - ~20% of winning bids result in bid_win transactions

### 3. User Generation Details

For each user:
- **Basic Info:** Generate username, email, name
- **Password:** Assign from predefined simple password list (for easy testing)
- **Seller Status:** ~60% chance of being a seller
  - If seller: Generate `sellerRating` (3.0-5.0), `totalSales` (0-500), `totalItemsListed` (0-100)
  - If not seller: Set seller fields to 0
- **Timestamps:** Generate `createdAt` (past 2 years) and `updatedAt` (recent 30 days)

### 4. Item Generation Details

For each item:
- **Category Selection:** Random selection from 12 categories
- **Seller Assignment:** Random user from seller users (users with seller stats)
- **Title Generation:** Category-specific title generators (see Title Generation Patterns above)
- **Price Calculation:** Random within category-specific range
- **Image URL:** Cycle through 100 different images
- **Auction Logic:** 40% chance of being auction
  - If auction:
    - Calculate `startingBid` (70% of base price)
    - Set `currentBid` initially to `startingBid` (updated after bids generated)
    - Set `bidIncrement` (1.0-5.0)
    - Set `endTime` to Unix timestamp (1-14 days from now)
    - Set `bidCount` to 0 initially (updated after bids generated)
  - If buy-now:
    - No auction fields
    - `bidCount` = 0

### 5. Payment Methods Generation Details

For each user:
- Generate 0-3 payment methods (random)
- First card is always default (`isDefault: true`)
- Card type, number, and expiry are generated using Faker
- Cardholder name is user's name in uppercase

### 6. Addresses Generation Details

For each user:
- Generate 1-2 addresses (random)
- First address is always default (`isDefault: true`)
- All addresses are in USA
- Street, city, state, and ZIP are generated using Faker

### 7. Bids Generation Details

For each auction item:
- Generate 3-8 bids (random)
- Bidders are selected from all users except the seller
- Bid amounts increase incrementally based on `bidIncrement`
- Bid times progress chronologically from auction start to end
- Only the highest bid is marked as winning
- After generation:
  - Update item `bidCount` to number of bids
  - Update item `currentBid` to highest bid amount

### 8. Transactions Generation Details

**Purchase Transactions:**
- ~30% of buy-now items are purchased
- Buyer is selected from all users except seller
- Quantity is 1-3 (limited by item quantity)
- Updates item quantity and status if sold out

**Bid Win Transactions:**
- ~20% of winning bids result in completed purchases
- References the winning bid
- Quantity is always 1
- Updates item status to 'sold' and quantity to 0

### 9. Output Files

All files are written to `src/data/` directory:

- `mock-categories.json` - 12 categories
- `mock-users.json` - 35 users (includes sellers)
- `mock-items.json` - 250 items
- `mock-payment_methods.json` - User payment methods
- `mock-addresses.json` - User addresses
- `mock-bids.json` - Bids on auction items
- `mock-transactions.json` - Purchase and bid_win transactions
- `summary.json` - Generation statistics and metadata

**Note:** No separate `mock-sellers.json` file - sellers are part of `mock-users.json`

## Field Naming Convention

All fields use **camelCase** to match the Drizzle schema exactly:

- `createdAt` (not `created_at`)
- `updatedAt` (not `updated_at`)
- `categoryId` (not `category_id`)
- `sellerId` (not `seller_id`)
- `auctionFlag` (not `auction_flag`)
- `startingBid` (not `starting_bid`)
- `endTime` (not `end_time`)
- `bidCount` (not `bid_count`)
- `sellerRating` (not `seller_rating`)
- `totalSales` (not `total_sales`)
- `totalItemsListed` (not `total_items_listed`)
- `cardType` (not `card_type`)
- `isDefault` (not `is_default`)
- `cardHolderName` (not `card_holder_name`)
- `zipCode` (not `zip_code`)
- `bidAmount` (not `bid_amount`)
- `bidTime` (not `bid_time`)
- `isWinning` (not `is_winning`)
- `transactionType` (not `transaction_type`)
- `paymentStatus` (not `payment_status`)
- `paymentMethod` (not `payment_method`)
- `paymentCardNumber` (not `payment_card_number`)
- `failureReason` (not `failure_reason`)
- `refundAmount` (not `refund_amount`)
- `refundedAt` (not `refunded_at`)
- `transactionDate` (not `transaction_date`)

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

**Exception:** `endTime` in items and `bidTime` in bids use Unix timestamp (INTEGER) for time-based calculations.

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
💳 Generating user payment methods...
🏠 Generating user addresses...
🎯 Generating bids for auction items...
💰 Generating transactions...
💾 Writing data to files...
✅ Data generation complete!

📊 Summary:
   Categories: 12
   Users: 35 (including ~21 sellers)
   Items: 250
   - Auction items: ~100
   - Buy-now items: ~150
   Payment Methods: ~70
   Addresses: ~52
   Bids: ~700
   - Winning bids: ~100
   Transactions: ~75
   - Purchases: ~45
   - Bid Wins: ~20

📁 Files saved to: /path/to/src/data
```

## Database Schema Mapping

The generated JSON files map directly to database tables:

| JSON File | Database Table | Key Fields | Notes |
|-----------|---------------|------------|-------|
| `mock-categories.json` | `categories` | `id`, `code`, `name` | Fixed 12 categories |
| `mock-users.json` | `users` | `id`, `username`, `email`, `sellerRating` | Includes sellers |
| `mock-items.json` | `items` | `id`, `categoryId`, `sellerId`, `auctionFlag`, `bidCount` | Mix of auction/buy-now |
| `mock-payment_methods.json` | `payment_methods` | `id`, `userId`, `cardType`, `cardNumber` | User payment methods |
| `mock-addresses.json` | `addresses` | `id`, `userId`, `street`, `city`, `state` | User shipping addresses |
| `mock-bids.json` | `bids` | `id`, `itemId`, `userId`, `bidAmount`, `isWinning` | Bids on auction items |
| `mock-transactions.json` | `transactions` | `id`, `itemId`, `userId`, `sellerId`, `transactionType` | Purchase and bid_win transactions |

**Important:** The `sellerId` in items references `users.id`, not a separate sellers table.

## Data Relationships Summary

### One-to-Many Relationships

1. **Categories → Items**
   - One category can have many items
   - Foreign key: `items.categoryId` → `categories.id`

2. **Users → Items** (as sellers)
   - One user can list many items
   - Foreign key: `items.sellerId` → `users.id`
   - Constraint: `ON DELETE RESTRICT` (cannot delete user with listed items)

3. **Users → Bids** (as bidders)
   - One user can place many bids
   - Foreign key: `bids.userId` → `users.id`
   - Constraint: `ON DELETE CASCADE` (bids deleted when user deleted)

4. **Users → Payment Methods**
   - One user can have many payment methods
   - Foreign key: `payment_methods.userId` → `users.id`

5. **Users → Addresses**
   - One user can have many addresses
   - Foreign key: `addresses.userId` → `users.id`

6. **Items → Bids**
   - One item can have many bids (auction items only)
   - Foreign key: `bids.itemId` → `items.id`
   - Constraint: `ON DELETE CASCADE` (bids deleted when item deleted)

7. **Users → Transactions** (as buyer or seller)
   - One user can have many transactions
   - Foreign keys: `transactions.userId` and `transactions.sellerId` → `users.id`
   - Constraint: `ON DELETE RESTRICT` (cannot delete user with transactions)

8. **Transactions → Payments**
   - One transaction can have many payment attempts
   - Foreign key: `payments.transactionId` → `transactions.id`

9. **Users → Inventory**
   - One user can own many items
   - Foreign key: `inventory.userId` → `users.id`
   - Constraint: `ON DELETE CASCADE` (inventory deleted when user deleted)

10. **Items → Inventory**
    - One item can be owned by many users (different quantities)
    - Foreign key: `inventory.itemId` → `items.id`
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
NUM_CATEGORIES = 12          # Fixed at 12 (not configurable)
NUM_USERS = 35               # Number of users (includes sellers)
NUM_ITEMS = 250              # Number of items
NUM_PAYMENT_METHODS_PER_USER = 2  # Average number of cards per user
```

**Seller Ratio:** Currently ~60% of users are sellers. Modify the `is_seller` probability in `generate_users()` to change this.

**Auction Ratio:** Currently ~40% of items are auctions. Modify the `is_auction` probability in `generate_items()` to change this.

**Purchase Rate:** Currently ~30% of buy-now items are purchased. Modify the purchase probability in `generate_transactions()` to change this.

**Bid Win Rate:** Currently ~20% of winning bids result in completed purchases. Modify the bid win probability in `generate_transactions()` to change this.

## Data Validation

### Required Fields
- Categories: `id`, `code`, `name`, `createdAt`
- Users: `id`, `username`, `email`, `password`, `createdAt`, `updatedAt`
- Items: `id`, `title`, `categoryId`, `sellerId`, `price`, `auctionFlag`, `status`, `quantity`, `bidCount`, `imageUrl`, `createdAt`, `updatedAt`
- Payment Methods: `id`, `userId`, `cardType`, `cardNumber`, `expiry`, `cardHolderName`, `isDefault`, `createdAt`
- Addresses: `id`, `userId`, `street`, `city`, `state`, `zipCode`, `country`, `isDefault`, `createdAt`
- Bids: `id`, `itemId`, `userId`, `bidAmount`, `isWinning`, `outcome`, `bidTime`, `createdAt`
- Transactions: `id`, `itemId`, `userId`, `sellerId`, `transactionType`, `amount`, `quantity`, `status`, `paymentStatus`, `transactionDate`, `createdAt`

### Field Constraints
- All IDs are INTEGER (positive integers)
- All timestamps use SQLite format (`YYYY-MM-DD HH:MM:SS.fff`) except Unix timestamps
- `auctionFlag` must be 0 or 1
- `status` must be one of: 'active', 'sold', 'cancelled', 'expired'
- `sellerRating` must be between 0.0 and 5.0
- `price` must be >= 0
- `quantity` must be >= 0
- `bidCount` must be >= 0
- `isWinning` must be 0 or 1
- `isDefault` must be true or false
- Auction items must have `startingBid` and `endTime` when `auctionFlag = 1`
- `transactionType` must be 'purchase' or 'bid_win'
- `paymentStatus` must be 'success', 'failed', or 'pending'
- `outcome` must be 'pending' or 'outbid'

## Notes

- **Auction Items:** ~40% of items are auctions (configurable via probability)
- **Seller Users:** ~60% of users have seller functionality (configurable)
- **Price Ranges:** Category-specific to ensure realistic pricing
- **Timestamps:** All dates use SQLite format (`YYYY-MM-DD HH:MM:SS.fff`) except `endTime` and `bidTime` (Unix timestamp)
- **Unix Timestamps:** Auction `endTime` and `bidTime` use Unix timestamp (seconds since epoch)
- **Bid Count:** Generated for auction items (3-8 bids per item), always 0 for buy-now items
- **Card Types:** Supports 'visa', 'mastercard', 'discover', 'amex'
- **Image URLs:** Cycle through 100 different images
- **Purchase Rate:** ~30% of buy-now items result in purchase transactions
- **Bid Win Rate:** ~20% of winning bids result in completed bid_win transactions

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**
   - Ensure `sellerId` in items references valid `users.id`
   - Ensure `categoryId` in items references valid `categories.id` (1-12)
   - Ensure `userId` in bids references valid `users.id` and is not the seller

2. **Missing Seller Stats**
   - If no sellers found, check that users have `sellerRating > 0` or `totalItemsListed > 0`
   - Increase seller probability in `generate_users()` if needed

3. **Auction Validation Errors**
   - Ensure auction items (`auctionFlag = 1`) have `startingBid` and `endTime`
   - Check that `endTime` is a Unix timestamp (INTEGER)

4. **Bid Generation Issues**
   - Ensure bids are only generated for auction items
   - Ensure bidders are not the seller
   - Ensure only one winning bid per item

5. **Transaction Generation Issues**
   - Ensure purchase transactions reference buy-now items
   - Ensure bid_win transactions reference winning bids
   - Ensure transaction dates are after bid times for bid_win transactions

6. **Timestamp Format Errors**
   - Ensure all timestamps use SQLite format: `YYYY-MM-DD HH:MM:SS.fff`
   - Use `format_datetime()` helper function for consistency
   - Ensure Unix timestamps are INTEGER (seconds since epoch)

## Related Documentation

- [Database Schema](../docs/database.md)
- [Technical Implementation](../docs/technical-implementation.md)
- [Feature Scope](../docs/feature-scope.md)
- [Credentials](../docs/credentials.md)
