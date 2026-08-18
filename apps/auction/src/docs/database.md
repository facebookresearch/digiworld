<!-- Copyright (c) Meta Platforms, Inc. and affiliates. -->
# Auction App Database Schema

## Overview

The auction app database is a comprehensive system designed to handle marketplace operations including item listings, auction bidding, instant purchases, transaction management, and payment processing. It supports both auction-style bidding and instant "Buy Now" purchases with full tracking of bids, transactions, payments, and inventory.

## Database Summary

### Implemented Tables (13 tables)
| Category | Tables | Count |
|----------|--------|-------|
| **Core Tables** | categories, users, items, sessions | 4 |
| **Auction Tables** | bids | 1 |
| **Transaction Tables** | transactions, payments, inventory, listings | 4 |
| **Payment Tables** | mock_cards, user_payment_methods | 2 |
| **Supporting Tables** | addresses, system_config | 2 |
| **Total Implemented** | | **13** |

### Key Features
- ✅ User authentication and profile management
- ✅ Item browsing and search functionality
- ✅ Auction bidding with deterministic outcomes
- ✅ Instant "Buy Now" purchases
- ✅ Item listing and selling
- ✅ Transaction tracking and history
- ✅ Mock payment processing with deterministic success/failure
- ✅ Inventory management for purchased items
- ✅ Session management for reproducible experiments

## Database Tables

### Core Tables

#### 1. Categories (`categories`)
**Purpose**: Stores predefined product categories for organizing items.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `2`, `5` |
| `code` | TEXT | NOT NULL, UNIQUE | Lowercase category code | `electronics`, `books`, `fashion` |
| `name` | TEXT | NOT NULL, UNIQUE | Display name for category | `Electronics`, `Books`, `Fashion` |
| `description` | TEXT | NULL | Category description | `Electronic devices and gadgets` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when category was created | `2024-01-15 10:30:00.000` |

**Fixed Categories:**
1. **Electronics** (`code: 'electronics'`) - Electronic devices and gadgets
2. **Books** (`code: 'books'`) - Books, magazines, and reading materials
3. **Fashion** (`code: 'fashion'`) - Clothing, accessories, and fashion items
4. **Home** (`code: 'home'`) - Home decor, furniture, and household items
5. **Toys** (`code: 'toys'`) - Toys, games, and children's items

**Indexes:**
- `idx_categories_code` on `code`

#### 2. Users (`users`)
**Purpose**: Stores user account information. Users can be both buyers and sellers.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `25`, `100` |
| `username` | TEXT | NOT NULL, UNIQUE | Unique username for login | `john_doe`, `seller123` |
| `email` | TEXT | NULL | User's email address | `john.doe@example.com` |
| `name` | TEXT | NULL | User's full name | `John Doe` |
| `password` | TEXT | NULL | Password hash (plain text for demo) | `password123` |
| `seller_rating` | REAL | DEFAULT 0 | Seller rating (0.0-5.0). 0 if not a seller | `4.5`, `0.0` |
| `total_sales` | INTEGER | DEFAULT 0 | Total number of sales completed | `150`, `0` |
| `total_items_listed` | INTEGER | DEFAULT 0 | Total items listed for sale | `50`, `0` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when account was created | `2024-01-15 10:30:00.000` |
| `updated_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp of last profile update | `2024-10-24 15:45:30.000` |

**Seller Identification:**
A user is considered a seller if:
- `seller_rating > 0` OR
- `total_items_listed > 0`

**Indexes:**
- `idx_users_username` on `username`

#### 3. Items (`items`)
**Purpose**: Core table storing all items available for sale. Supports both auction and buy-now modes.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `50`, `100` |
| `title` | TEXT | NOT NULL | Item title/name | `Smart Wireless Headphones` |
| `description` | TEXT | NULL | Item description | `High-quality wireless headphones...` |
| `category_id` | INTEGER | NOT NULL, FK → categories.id | Category this item belongs to | `1`, `2`, `5` |
| `seller_id` | INTEGER | NOT NULL, FK → users.id | User who listed this item | `5`, `12`, `25` |
| `price` | REAL | NOT NULL | Buy-now price or starting bid | `99.99`, `299.50` |
| `auction_flag` | INTEGER | NOT NULL, DEFAULT 0 | 1 = auction, 0 = buy-now | `1`, `0` |
| `current_bid` | REAL | NULL | Current highest bid (auction items only) | `125.00`, `NULL` |
| `starting_bid` | REAL | NULL | Starting bid amount (auction items only) | `100.00`, `NULL` |
| `bid_increment` | REAL | DEFAULT 1.0 | Minimum bid increment (auction items) | `5.0`, `1.0` |
| `end_time` | INTEGER | NULL | Unix timestamp for auction end (auction items) | `1735689600`, `NULL` |
| `status` | TEXT | DEFAULT 'active' | Item status: 'active', 'sold', 'cancelled', 'expired' | `active`, `sold` |
| `expires_in` | TEXT | NULL | Relative expiration time display | `2 days`, `NULL` |
| `expired` | INTEGER | DEFAULT 0 | Boolean: 1 if auction ended manually | `0`, `1` |
| `quantity` | INTEGER | DEFAULT 1 | Inventory quantity available | `1`, `10` |
| `bid_count` | INTEGER | DEFAULT 0 | Number of bids on this item | `15`, `0` |
| `image_url` | TEXT | NULL | Image URL or base64 data | `https://...`, `NULL` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when item was created | `2024-01-15 10:30:00.000` |
| `updated_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp of last update | `2024-10-24 15:45:30.000` |
| `sold_at` | TEXT | NULL | ISO 8601 timestamp when item was sold | `NULL`, `2024-10-25 14:20:00.000` |

**Auction Items** (`auction_flag = 1`):
- Must have `starting_bid` and `end_time` set
- `current_bid` tracks highest bid
- `bid_count` tracks number of bids
- Bidding closes at `end_time` (Unix timestamp)

**Buy-Now Items** (`auction_flag = 0`):
- No auction fields required
- `bid_count` is always 0
- Can be purchased immediately at `price`

**Indexes:**
- `idx_items_category` on `category_id`
- `idx_items_seller` on `seller_id`
- `idx_items_status` on `status`
- `idx_items_auction_flag` on `auction_flag`
- `idx_items_end_time` on `end_time`

#### 4. Sessions (`sessions`)
**Purpose**: Tracks deterministic test sessions for reproducible AI agent experiments.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `10`, `50` |
| `session_id` | TEXT | NOT NULL, UNIQUE | External session identifier | `session_001`, `agent_test_42` |
| `user_id` | INTEGER | NULL, FK → users.id | User associated with session | `1`, `25`, `NULL` |
| `seed` | INTEGER | NOT NULL | Random seed for deterministic outcomes | `42`, `12345` |
| `transactions_succeed` | INTEGER | DEFAULT 1 | 1 = succeed, 0 = fail (global toggle) | `1`, `0` |
| `status` | TEXT | DEFAULT 'active' | Session status: 'active', 'ended' | `active`, `ended` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when session was created | `2024-01-15 10:30:00.000` |
| `ended_at` | TEXT | NULL | ISO 8601 timestamp when session ended | `NULL`, `2024-10-25 18:00:00.000` |
| `metadata` | TEXT | NULL | JSON metadata for additional session data | `{"agent_id": "agent_001"}`, `NULL` |

**Indexes:**
- `idx_sessions_user` on `user_id`
- `idx_sessions_status` on `status`
- `idx_sessions_seed` on `seed`

### Auction Tables

#### 5. Bids (`bids`)
**Purpose**: Tracks all bids placed on auction items.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `50`, `200` |
| `session_id` | INTEGER | NULL, FK → sessions.id | Session this bid belongs to | `1`, `NULL` |
| `item_id` | INTEGER | NOT NULL, FK → items.id | Item being bid on | `5`, `25`, `100` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | User placing the bid | `3`, `15`, `30` |
| `bid_amount` | REAL | NOT NULL | Bid amount | `125.00`, `299.99` |
| `outcome` | TEXT | NULL | Bid outcome: 'won', 'lost', 'pending', 'outbid' | `won`, `lost`, `NULL` |
| `is_winning` | INTEGER | DEFAULT 0 | Boolean: 1 if this is current winning bid | `0`, `1` |
| `bid_time` | INTEGER | NULL | Unix timestamp when bid was placed | `1735689600`, `NULL` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when bid was created | `2024-01-15 10:30:00.000` |
| `deterministic_seed` | INTEGER | NULL | Seed used for deterministic outcome | `42`, `NULL` |

**Bid Rules:**
- Only one bid per item can have `is_winning = 1`
- Highest bid amount becomes the winning bid
- Bids cannot be cancelled once placed
- Bidding closes when `item.end_time` is reached

**Indexes:**
- `idx_bids_item` on `item_id`
- `idx_bids_user` on `user_id`
- `idx_bids_session` on `session_id`
- `idx_bids_outcome` on `outcome`

### Transaction Tables

#### 6. Transactions (`transactions`)
**Purpose**: Tracks all purchases, sales, refunds, and bid wins.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `50`, `200` |
| `session_id` | INTEGER | NULL, FK → sessions.id | Session this transaction belongs to | `1`, `NULL` |
| `transaction_type` | TEXT | NOT NULL | Type: 'purchase', 'bid_win', 'listing', 'sale', 'refund' | `purchase`, `bid_win` |
| `item_id` | INTEGER | NULL, FK → items.id | Item involved in transaction | `5`, `25`, `NULL` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | Buyer/user in transaction | `3`, `15`, `30` |
| `seller_id` | INTEGER | NULL, FK → users.id | Seller in transaction | `5`, `12`, `NULL` |
| `bid_id` | INTEGER | NULL, FK → bids.id | Bid that led to this transaction | `10`, `NULL` |
| `amount` | REAL | NOT NULL | Transaction amount | `99.99`, `299.50` |
| `quantity` | INTEGER | DEFAULT 1 | Quantity purchased | `1`, `3` |
| `status` | TEXT | DEFAULT 'completed' | Status: 'completed', 'pending', 'cancelled', 'refunded' | `completed`, `refunded` |
| `payment_status` | TEXT | DEFAULT 'pending' | Payment status: 'pending', 'success', 'failed' | `success`, `failed` |
| `payment_method` | TEXT | NULL | Payment method used | `credit_card`, `mock_card` |
| `payment_card_number` | TEXT | NULL | Card number (last 4 digits or mock card) | `4242`, `4242 4242 4242 4242` |
| `failure_reason` | TEXT | NULL | Reason for payment failure | `DECLINED`, `INSUFFICIENT_FUNDS` |
| `refund_amount` | REAL | DEFAULT 0 | Amount refunded | `0`, `99.99` |
| `refunded_at` | TEXT | NULL | ISO 8601 timestamp when refunded | `NULL`, `2024-10-25 16:00:00.000` |
| `transaction_date` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp of transaction | `2024-01-15 10:30:00.000` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when record was created | `2024-01-15 10:30:00.000` |
| `metadata` | TEXT | NULL | JSON metadata for additional data | `{"source": "buy_now"}`, `NULL` |

**Transaction Types:**
- `purchase` - Direct buy-now purchase
- `bid_win` - Winning an auction
- `listing` - Listing an item for sale
- `sale` - Selling an item
- `refund` - Refund transaction

**Indexes:**
- `idx_transactions_user` on `user_id`
- `idx_transactions_item` on `item_id`
- `idx_transactions_session` on `session_id`
- `idx_transactions_type` on `transaction_type`
- `idx_transactions_status` on `status`

#### 7. Payments (`payments`)
**Purpose**: Tracks payment processing attempts for transactions.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `50`, `200` |
| `transaction_id` | INTEGER | NOT NULL, FK → transactions.id | Transaction this payment is for | `5`, `25`, `100` |
| `card_number` | TEXT | NOT NULL | Card number (full or masked) | `4242 4242 4242 4242` |
| `card_type` | TEXT | NULL | Card type: 'visa', 'mastercard', 'mock' | `visa`, `mastercard` |
| `amount` | REAL | NOT NULL | Payment amount | `99.99`, `299.50` |
| `status` | TEXT | NOT NULL | Payment status: 'success', 'declined', 'pending' | `success`, `declined` |
| `failure_reason` | TEXT | NULL | Failure reason if declined | `DECLINED`, `INSUFFICIENT_FUNDS` |
| `processed_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when payment was processed | `2024-01-15 10:30:00.000` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when record was created | `2024-01-15 10:30:00.000` |
| `deterministic_seed` | INTEGER | NULL | Seed used for deterministic outcome | `42`, `NULL` |

**Indexes:**
- `idx_payments_transaction` on `transaction_id`
- `idx_payments_status` on `status`
- `idx_payments_card` on `card_number`

#### 8. Inventory (`inventory`)
**Purpose**: Tracks items purchased by users.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `50`, `200` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | User who owns this item | `3`, `15`, `30` |
| `item_id` | INTEGER | NOT NULL, FK → items.id | Item owned | `5`, `25`, `100` |
| `transaction_id` | INTEGER | NULL, FK → transactions.id | Transaction that created this inventory | `10`, `NULL` |
| `quantity` | INTEGER | DEFAULT 1 | Quantity owned | `1`, `3` |
| `acquired_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when item was acquired | `2024-01-15 10:30:00.000` |

**Indexes:**
- `idx_inventory_user` on `user_id`
- `idx_inventory_item` on `item_id`

#### 9. Listings (`listings`)
**Purpose**: Tracks items listed for sale by users.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `50`, `200` |
| `session_id` | INTEGER | NULL, FK → sessions.id | Session this listing belongs to | `1`, `NULL` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | User who listed the item | `5`, `12`, `25` |
| `item_id` | INTEGER | NOT NULL, FK → items.id | Item being listed | `5`, `25`, `100` |
| `list_price` | REAL | NOT NULL | Price item was listed at | `99.99`, `299.50` |
| `list_date` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when item was listed | `2024-01-15 10:30:00.000` |
| `status` | TEXT | DEFAULT 'active' | Listing status: 'active', 'sold', 'cancelled', 'expired' | `active`, `sold` |

**Indexes:**
- `idx_listings_user` on `user_id`

### Payment Tables

#### 10. Mock Cards (`mock_cards`)
**Purpose**: Predefined cards for deterministic payment testing.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `5`, `10` |
| `card_number` | TEXT | NOT NULL, UNIQUE | Card number string | `4242 4242 4242 4242` |
| `card_type` | TEXT | NOT NULL | Card type: 'visa', 'mastercard', 'mock' | `visa`, `mastercard` |
| `always_succeeds` | INTEGER | DEFAULT 1 | 1 = always succeeds, 0 = always fails | `1`, `0` |
| `failure_reason` | TEXT | NULL | Failure reason if always fails | `DECLINED`, `INSUFFICIENT_FUNDS` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when record was created | `2024-01-15 10:30:00.000` |

**Predefined Cards:**
| Card Number | Type | Always Succeeds | Failure Reason |
|------------|------|----------------|----------------|
| `4242 4242 4242 4242` | visa | ✅ Yes | - |
| `4000 0000 0000 0002` | visa | ❌ No | DECLINED |
| `4000 0000 0000 9995` | visa | ❌ No | INSUFFICIENT_FUNDS |
| `5555 5555 5555 4444` | mastercard | ✅ Yes | - |
| `5105 1051 0510 5100` | mastercard | ✅ Yes | - |
| `4000 0000 0000 0069` | visa | ❌ No | EXPIRED_CARD |
| `4000 0000 0000 0127` | visa | ❌ No | INCORRECT_CVC |
| `4000 0000 0000 0119` | visa | ❌ No | PROCESSING_ERROR |
| `4111 1111 1111 1111` | visa | ✅ Yes | - |
| `4000 0000 0000 0259` | visa | ❌ No | DECLINED |

#### 11. User Payment Methods (`user_payment_methods`)
**Purpose**: Stores user's saved payment cards.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `5`, `10` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | User who owns this card | `3`, `15`, `30` |
| `card_type` | TEXT | NOT NULL | Card type | `visa`, `mastercard` |
| `card_number` | TEXT | NOT NULL | Card number (should be encrypted) | `4242 4242 4242 4242` |
| `expiry` | TEXT | NOT NULL | Card expiry date | `12/25`, `01/26` |
| `card_holder_name` | TEXT | NOT NULL | Cardholder name | `John Doe` |
| `is_default` | INTEGER | DEFAULT 0 | Boolean: 1 if default payment method | `0`, `1` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when record was created | `2024-01-15 10:30:00.000` |

**Indexes:**
- `idx_user_payment_methods_user` on `user_id`

### Supporting Tables

#### 12. Addresses (`addresses`)
**Purpose**: Stores user shipping addresses.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `5`, `10` |
| `user_id` | INTEGER | NOT NULL, FK → users.id | User who owns this address | `3`, `15`, `30` |
| `street` | TEXT | NOT NULL | Street address | `123 Main St` |
| `city` | TEXT | NOT NULL | City | `New York` |
| `state` | TEXT | NOT NULL | State | `NY` |
| `zip_code` | TEXT | NOT NULL | ZIP code | `10001` |
| `country` | TEXT | NOT NULL | Country | `United States` |
| `is_default` | INTEGER | DEFAULT 0 | Boolean: 1 if default address | `0`, `1` |
| `created_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp when record was created | `2024-01-15 10:30:00.000` |

**Indexes:**
- `idx_addresses_user` on `user_id`

#### 13. System Config (`system_config`)
**Purpose**: Key-value store for system configuration.

| Column | Type | Constraints | Description | Example |
|--------|------|-------------|-------------|---------|
| `id` | INTEGER | PRIMARY KEY, AUTOINCREMENT | Auto-generated unique identifier | `1`, `5`, `10` |
| `key` | TEXT | NOT NULL, UNIQUE | Configuration key | `transactions_succeed` |
| `value` | TEXT | NULL | Configuration value | `true`, `false` |
| `data_type` | TEXT | NULL | Data type: 'string', 'number', 'boolean' | `boolean`, `string` |
| `category` | TEXT | NULL | Config category | `features`, `payment` |
| `description` | TEXT | NULL | Config description | `Control if transactions succeed` |
| `updated_at` | TEXT | NOT NULL, DEFAULT now() | ISO 8601 timestamp of last update | `2024-01-15 10:30:00.000` |

**Common Config Keys:**
- `transactions_succeed` - Global toggle for transaction success (boolean)

---

## Relationships

### Primary Relationships (Implemented)
| Parent Table | Child Table | Relationship Type | Description |
|-------------|-------------|-------------------|-------------|
| **categories** | **items** | 1:many | One category can have many items |
| **users** | **items** (as seller) | 1:many | One user can list many items |
| **users** | **bids** | 1:many | One user can place many bids |
| **items** | **bids** | 1:many | One item can receive many bids |
| **sessions** | **bids** | 1:many | One session can have many bids |
| **sessions** | **transactions** | 1:many | One session can have many transactions |
| **transactions** | **payments** | 1:many | One transaction can have multiple payment attempts |
| **users** | **transactions** (as buyer) | 1:many | One user can have many transactions |
| **users** | **transactions** (as seller) | 1:many | One user can sell many items |
| **users** | **inventory** | 1:many | One user can own many items |
| **items** | **inventory** | 1:many | One item can be owned by many users |
| **users** | **listings** | 1:many | One user can list many items |
| **items** | **listings** | 1:many | One item can be listed multiple times |
| **users** | **user_payment_methods** | 1:many | One user can have many payment methods |
| **users** | **addresses** | 1:many | One user can have many addresses |

## Business Rules

### Auction Management
1. **Bidding Rules**: Bids must be strictly greater than current price (no increments enforced)
2. **Bidding Window**: Bidding closes when `end_time` is reached (Unix timestamp)
3. **Winning Bid**: Highest bid amount becomes the winning bid (`is_winning = 1`)
4. **Bid Outcomes**: Bids can have outcomes: 'won', 'lost', 'pending', 'outbid'

### Buy Now Purchases
1. **Instant Purchase**: Buy-now items can be purchased immediately at listed price
2. **No Quantity Checks**: Items are sold immediately without inventory validation
3. **Payment Required**: User must have at least one payment method before purchasing

### Transaction Management
1. **Transaction Types**: Supports purchase, bid_win, listing, sale, and refund
2. **Payment Processing**: All transactions require payment processing
3. **Refunds**: Full refunds (100%) are supported for purchases
4. **Status Tracking**: Transactions track both transaction status and payment status

### Data Integrity
1. **Foreign Key Constraints**: All relationships enforced at database level
2. **Cascade Deletes**: Bids, inventory, and payment methods cascade on user delete
3. **Restrict Deletes**: Items and transactions restrict deletion if referenced
4. **Unique Constraints**: Username, category codes/names, card numbers must be unique

### Performance Considerations
1. **Indexing**: All foreign keys and frequently queried columns are indexed
2. **Denormalization**: Item details include seller info for faster queries
3. **Timestamp Defaults**: All tables include creation and update timestamps

## Enums and Constants

### Item Status
| Value | Description | When Used |
|-------|-------------|-----------|
| `active` | Item is active and available | Default state for new items |
| `sold` | Item has been sold | After successful purchase or auction win |
| `cancelled` | Item listing cancelled | When seller cancels listing |
| `expired` | Auction has expired | When auction end_time is reached or manually ended |

### Transaction Type
| Value | Description | Use Case |
|-------|-------------|----------|
| `purchase` | Direct buy-now purchase | Instant purchase of buy-now item |
| `bid_win` | Winning an auction | When user wins auction |
| `listing` | Listing an item for sale | When user creates a listing |
| `sale` | Selling an item | When item is sold to buyer |
| `refund` | Refund transaction | When purchase is refunded |

### Transaction Status
| Value | Description | When Applied |
|-------|-------------|--------------|
| `completed` | Transaction completed successfully | After successful payment |
| `pending` | Transaction pending processing | Initial state before payment |
| `cancelled` | Transaction cancelled | When user cancels transaction |
| `refunded` | Transaction refunded | After refund is processed |

### Payment Status
| Value | Description | When Applied |
|-------|-------------|--------------|
| `pending` | Payment not yet processed | Initial state |
| `success` | Payment completed successfully | After successful payment processing |
| `failed` | Payment processing failed | When payment is declined or fails |

### Bid Outcome
| Value | Description | Use Case |
|-------|-------------|----------|
| `won` | Bid won the auction | Highest bid when auction closes |
| `lost` | Bid lost the auction | Lower bid when auction closes |
| `pending` | Bid outcome not yet determined | Active auction |
| `outbid` | Bid was outbid by higher bid | When another user places higher bid |

## Query Patterns

### Common Queries

**Get Active Items by Category:**
```sql
SELECT * FROM items 
WHERE category_id = ? AND status = 'active' 
ORDER BY created_at DESC
```

**Get User's Bids:**
```sql
SELECT b.*, i.title, i.current_bid
FROM bids b
JOIN items i ON b.item_id = i.id
WHERE b.user_id = ?
ORDER BY b.created_at DESC
```

**Get User's Transactions:**
```sql
SELECT t.*, i.title, i.image_url
FROM transactions t
LEFT JOIN items i ON t.item_id = i.id
WHERE t.user_id = ? 
ORDER BY t.transaction_date DESC
```

**Get Winning Bid for Item:**
```sql
SELECT * FROM bids
WHERE item_id = ? AND is_winning = 1
LIMIT 1
```

**Get User's Inventory:**
```sql
SELECT inv.*, i.title, i.image_url, i.description
FROM inventory inv
JOIN items i ON inv.item_id = i.id
WHERE inv.user_id = ?
ORDER BY inv.acquired_at DESC
```

## Best Practices

### Data Integrity
1. **Foreign Key Constraints**: Ensure referential integrity
2. **Unique Constraints**: Prevent duplicate entries
3. **Transaction Atomicity**: Use database transactions for multi-step operations
4. **Validation**: Validate auction end times and bid amounts before insertion

### Performance
1. **Indexing**: Index frequently queried columns (category_id, seller_id, status)
2. **Query Optimization**: Use appropriate WHERE clauses and LIMITs
3. **Pagination**: Implement pagination for large result sets
4. **Batch Operations**: Use batch inserts/updates when loading mock data

### Security
1. **Input Validation**: Validate all user inputs (bid amounts, card numbers)
2. **SQL Injection Prevention**: Use parameterized queries (Drizzle ORM handles this)
3. **Data Encryption**: Encrypt sensitive data (passwords, card numbers)
4. **Access Control**: Verify user ownership before data access

### Maintenance
1. **Migrations**: Use migration system for schema changes
2. **Backup**: Regular database backups
3. **Cleanup**: Periodic cleanup of expired auctions and old sessions
4. **Monitoring**: Monitor query performance and optimize as needed

## Migration System

Database migrations are managed through the `src/db/migrations/` directory. Migrations are executed in order to apply schema changes.

**Migration Files:**
- `index.ts` - Migration execution logic
- Individual migration files numbered sequentially

**Migration Process:**
1. Create migration file with schema changes
2. Add migration to migration list
3. Execute migrations on app initialization
4. Verify migration success

## Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Expo SQLite Guide](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [SQLite Performance Best Practices](https://www.sqlite.org/optoverview.html)

## Related Documentation

- [Technical Implementation](./technical-implementation.md)
- [Data Generation](./data.md)
- [Feature Scope](./feature-scope.md)
